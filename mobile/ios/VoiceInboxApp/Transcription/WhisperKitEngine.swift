import Foundation

#if canImport(WhisperKit)
import WhisperKit
#endif

enum WhisperKitEngine {
  static func isAvailable() -> Bool {
    #if canImport(WhisperKit)
    return true
    #else
    return false
    #endif
  }

  static func prepare(modelName: String, cacheFolder: String) async throws {
    #if canImport(WhisperKit)
    guard isModelCached(modelName: modelName, cacheFolder: cacheFolder) else {
      throw TranscriptionJobError.modelNotDownloaded
    }
    _ = try await loadPipeline(modelName: modelName, cacheFolder: cacheFolder)
    #else
    throw TranscriptionJobError.modelUnavailable
    #endif
  }

  static func downloadModel(
    modelName: String,
    cacheFolder: String,
    onProgress: @escaping (_ fraction: Double, _ phase: String, _ bytesOnDisk: Int) -> Void,
  ) async throws {
    #if canImport(WhisperKit)
    var progressThrottle = DownloadProgressThrottleState()
    let reportProgress: (Double, String) -> Void = { fraction, phase in
      let bytes = progressThrottle.resolvedBytes(
        modelName: modelName,
        cacheFolder: cacheFolder,
        fraction: fraction,
        phase: phase,
      )
      onProgress(min(1.0, max(0, fraction)), phase, bytes)
    }

    if isModelCached(modelName: modelName, cacheFolder: cacheFolder) {
      reportProgress(0.05, "preparing")
      _ = try await loadPipeline(modelName: modelName, cacheFolder: cacheFolder)
      reportProgress(1.0, "preparing")
      return
    }

    downloadCancelled = false
    try purgeIncompleteWhisperKitArtifacts(modelName: modelName, cacheFolder: cacheFolder)
    try ensureWhisperKitDownloadDirectories(modelName: modelName, cacheFolder: cacheFolder)

    let downloadBase = cacheURL(from: cacheFolder)
    let variant = whisperKitDownloadVariant(from: modelName)
    let downloadFractionCap = 0.82

    do {
      let modelFolder = try await WhisperKit.download(
        variant: variant,
        downloadBase: downloadBase,
        useBackgroundSession: false,
        from: whisperKitModelRepo,
        progressCallback: { progress in
          guard !downloadCancelled, !Task.isCancelled else { return }
          let fraction = min(downloadFractionCap, progress.fractionCompleted * downloadFractionCap)
          reportProgress(fraction, "downloading")
        },
      )

      guard !downloadCancelled, !Task.isCancelled else {
        throw TranscriptionJobError.cancelled
      }

      guard isModelCached(modelName: modelName, cacheFolder: cacheFolder) else {
        throw TranscriptionJobError.unknown("download_incomplete")
      }

      reportProgress(downloadFractionCap, "preparing")
      let pipeline = try await createPipeline(
        modelName: modelName,
        cacheFolder: cacheFolder,
        modelFolder: modelFolder,
      )
      cachedPipeline = pipeline
      cachedModelName = modelName
      reportProgress(0.96, "preparing")
      reportProgress(1.0, "preparing")
    } catch {
      if downloadCancelled || Task.isCancelled || (error as? TranscriptionJobError) == .cancelled {
        throw TranscriptionJobError.cancelled
      }
      if isWhisperKitDownloadCorruptionError(error) {
        try? purgeIncompleteWhisperKitArtifacts(modelName: modelName, cacheFolder: cacheFolder)
      }
      throw error
    }
    #else
    throw TranscriptionJobError.modelUnavailable
    #endif
  }

  static func cancelModelDownload() {
    #if canImport(WhisperKit)
    downloadCancelled = true
    #endif
  }

  static func isModelCached(modelName: String, cacheFolder: String) -> Bool {
    #if canImport(WhisperKit)
    return hasCompleteWhisperKitArtifacts(modelName: modelName, cacheFolder: cacheFolder)
    #else
    return false
    #endif
  }

  static func getModelStorageBytes(modelName: String, cacheFolder: String) -> Int {
    #if canImport(WhisperKit)
    return resolvedModelStorageBytes(modelName: modelName, cacheFolder: cacheFolder)
    #else
    return 0
    #endif
  }

  static func invalidatePipelineCache() {
    #if canImport(WhisperKit)
    cachedPipeline = nil
    cachedModelName = nil
    #endif
  }

  static func deleteModel(modelName: String, cacheFolder: String) throws {
    #if canImport(WhisperKit)
    try purgeIncompleteWhisperKitArtifacts(modelName: modelName, cacheFolder: cacheFolder)
    let roots = findModelRootURLs(modelName: modelName, cacheFolder: cacheFolder)
    let fileManager = FileManager.default
    for root in roots where fileManager.fileExists(atPath: root.path) {
      try fileManager.removeItem(at: root)
    }
    if cachedModelName == modelName {
      cachedPipeline = nil
      cachedModelName = nil
    }
    #else
    throw TranscriptionJobError.modelUnavailable
    #endif
  }

  #if canImport(WhisperKit)
  private static let requiredModelComponents = [
    "MelSpectrogram.mlmodelc",
    "AudioEncoder.mlmodelc",
    "TextDecoder.mlmodelc",
  ]
  private static var cachedPipeline: WhisperKit?
  private static var cachedModelName: String?
  private static var downloadCancelled = false

  private static let whisperKitModelRepo = "argmaxinc/whisperkit-coreml"

  private static func loadPipeline(modelName: String, cacheFolder: String) async throws -> WhisperKit {
    if let cachedPipeline, cachedModelName == modelName {
      return cachedPipeline
    }

    try ensureWhisperKitDownloadDirectories(modelName: modelName, cacheFolder: cacheFolder)

    do {
      let pipeline = try await createPipeline(modelName: modelName, cacheFolder: cacheFolder)
      cachedPipeline = pipeline
      cachedModelName = modelName
      return pipeline
    } catch {
      guard isWhisperKitDownloadCorruptionError(error) else {
        throw error
      }

      NSLog(
        "[Transcription] WhisperKit download cache corrupted for %@, purging and retrying once: %@",
        modelName,
        error.localizedDescription,
      )
      try purgeIncompleteWhisperKitArtifacts(modelName: modelName, cacheFolder: cacheFolder)
      try ensureWhisperKitDownloadDirectories(modelName: modelName, cacheFolder: cacheFolder)
      let pipeline = try await createPipeline(modelName: modelName, cacheFolder: cacheFolder)
      cachedPipeline = pipeline
      cachedModelName = modelName
      return pipeline
    }
  }

  private static func whisperKitDownloadVariant(from modelName: String) -> String {
    let prefix = "openai_whisper-"
    if modelName.hasPrefix(prefix) {
      return String(modelName.dropFirst(prefix.count))
    }
    return modelName
  }

  private static func resolvedModelFolderURL(modelName: String, cacheFolder: String) -> URL? {
    guard hasCompleteWhisperKitArtifacts(modelName: modelName, cacheFolder: cacheFolder) else {
      return nil
    }
    return huggingFaceModelDir(modelName: modelName, downloadBase: cacheURL(from: cacheFolder))
  }

  private static func createPipeline(
    modelName: String,
    cacheFolder: String,
    modelFolder: URL? = nil,
  ) async throws -> WhisperKit {
    let downloadBase = cacheURL(from: cacheFolder)
    let folder = modelFolder ?? resolvedModelFolderURL(modelName: modelName, cacheFolder: cacheFolder)
    guard let folder else {
      throw TranscriptionJobError.modelNotDownloaded
    }

    let config = WhisperKitConfig(
      model: modelName,
      downloadBase: downloadBase,
      modelFolder: folder.path,
      verbose: false,
      logLevel: .none,
      load: true,
    )
    return try await WhisperKit(config)
  }

  static func transcribe(
    audioPath: String,
    modelName: String,
    cacheFolder: String,
    language: String,
    prompt: String?,
  ) async throws -> (text: String, segments: [TranscriptionSegmentPayload], detectedLanguage: String?) {
    let pipeline = try await loadPipeline(modelName: modelName, cacheFolder: cacheFolder)
    var options = DecodingOptions()
    options.skipSpecialTokens = true
    options.withoutTimestamps = false
    if language != "auto" {
      options.language = language
      options.detectLanguage = false
    } else {
      options.detectLanguage = true
    }
    if let prompt, !prompt.isEmpty {
      do {
        try await pipeline.loadTokenizerIfNeeded()
        if let tokenizer = pipeline.tokenizer {
          options.promptTokens = tokenizer.encode(text: prompt)
        }
      } catch {
        NSLog("[Transcription] Prompt tokenization skipped: %@", error.localizedDescription)
      }
    }

    let results = try await pipeline.transcribe(audioPath: audioPath, decodeOptions: options)
    guard let first = results.first else {
      return ("", [], nil)
    }

    let text = cleanTranscriptText(first.text)
    var segments: [TranscriptionSegmentPayload] = []
    var index = 0
    for segment in first.segments {
      let startMs = Int(segment.start * 1000)
      let endMs = Int(segment.end * 1000)
      let segmentText = cleanTranscriptText(segment.text)
      let payload = TranscriptionSegmentPayload(
        id: String(index),
        text: segmentText,
        startMs: startMs,
        endMs: endMs,
        startTime: formatTimestampMs(startMs),
        speakerId: nil,
        language: first.language,
        isOverlapping: nil,
      )
      if !payload.text.isEmpty {
        segments.append(payload)
        index += 1
      }
    }

    return (text, segments, first.language)
  }

  private static func cleanTranscriptText(_ text: String) -> String {
    let pattern = #"<\|[^|>]+\|>"#
    let stripped = text.replacingOccurrences(
      of: pattern,
      with: " ",
      options: .regularExpression,
    )
    return stripped
      .components(separatedBy: .whitespacesAndNewlines)
      .filter { !$0.isEmpty }
      .joined(separator: " ")
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private static func pathMatchesModel(_ path: String, modelName: String) -> Bool {
    if path.contains(modelName) {
      return true
    }

    let slug = modelName.replacingOccurrences(of: "openai_whisper-", with: "")
    if !slug.isEmpty, path.contains(slug) {
      return true
    }

    if slug.hasPrefix("large-v3"), path.contains("large-v3") {
      return true
    }
    if slug.hasPrefix("large-v2"), path.contains("large-v2") {
      return true
    }

    return false
  }

  private static func cacheURL(from path: String) -> URL {
    if path.hasPrefix("file://") {
      return URL(string: path) ?? URL(fileURLWithPath: String(path.dropFirst(7)))
    }
    return URL(fileURLWithPath: path)
  }

  private static func whisperKitRepoRoot(downloadBase: URL) -> URL {
    downloadBase.appendingPathComponent("models/argmaxinc/whisperkit-coreml", isDirectory: true)
  }

  private static func hasCompleteWhisperKitArtifacts(modelName: String, cacheFolder: String) -> Bool {
    let fileManager = FileManager.default
    let candidates = [
      huggingFaceModelDir(modelName: modelName, downloadBase: cacheURL(from: cacheFolder)),
      legacyHuggingFaceModelDir(modelName: modelName),
    ].compactMap { $0 }

    for modelDir in candidates where fileManager.fileExists(atPath: modelDir.path) {
      let complete = requiredModelComponents.allSatisfy { component in
        let coreData = modelDir
          .appendingPathComponent(component, isDirectory: true)
          .appendingPathComponent("coremldata.bin")
        return fileManager.fileExists(atPath: coreData.path)
      }
      if complete {
        return true
      }
    }

    return false
  }

  private static func ensureWhisperKitDownloadDirectories(modelName: String, cacheFolder: String) throws {
    let downloadBase = cacheURL(from: cacheFolder)
    let fileManager = FileManager.default
    let directories = [
      downloadBase,
      whisperKitRepoRoot(downloadBase: downloadBase),
      huggingFaceModelDir(modelName: modelName, downloadBase: downloadBase),
    ]

    for directory in directories {
      try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
    }
  }

  private static func purgeIncompleteWhisperKitArtifacts(modelName: String, cacheFolder: String) throws {
    let downloadBase = cacheURL(from: cacheFolder)
    let fileManager = FileManager.default
    let repoRoot = whisperKitRepoRoot(downloadBase: downloadBase)
    let cacheDir = repoRoot.appendingPathComponent(".cache", isDirectory: true)

    if fileManager.fileExists(atPath: cacheDir.path) {
      try fileManager.removeItem(at: cacheDir)
    }

    let modelDir = huggingFaceModelDir(modelName: modelName, downloadBase: downloadBase)
    if fileManager.fileExists(atPath: modelDir.path),
       !hasCompleteWhisperKitArtifacts(modelName: modelName, cacheFolder: cacheFolder) {
      try fileManager.removeItem(at: modelDir)
    }
  }

  private static func isWhisperKitDownloadCorruptionError(_ error: Error) -> Bool {
    let lower = error.localizedDescription.lowercased()
    return lower.contains("incomplete") ||
      lower.contains("weight.bin") ||
      lower.contains("couldn't be moved") ||
      lower.contains("could not be moved") ||
      lower.contains("не удалось переместить") ||
      (lower.contains("model") && lower.contains("not found"))
  }

  private static func huggingFaceModelDir(modelName: String, downloadBase: URL) -> URL {
    downloadBase
      .appendingPathComponent("models/argmaxinc/whisperkit-coreml", isDirectory: true)
      .appendingPathComponent(modelName, isDirectory: true)
  }

  private static func legacyHuggingFaceModelDir(modelName: String) -> URL? {
    guard let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
      return nil
    }
    return docs
      .appendingPathComponent("huggingface/models/argmaxinc/whisperkit-coreml", isDirectory: true)
      .appendingPathComponent(modelName, isDirectory: true)
  }

  private static func modelSearchBases(modelName: String, cacheFolder: String) -> [URL] {
    let downloadBase = cacheURL(from: cacheFolder)
    var bases = [downloadBase]
    let hfDir = huggingFaceModelDir(modelName: modelName, downloadBase: downloadBase)
    bases.append(hfDir)
    if let legacyDir = legacyHuggingFaceModelDir(modelName: modelName) {
      bases.append(legacyDir)
    }
    return bases
  }

  private static func findModelRootURLs(modelName: String, cacheFolder: String) -> [URL] {
    let fileManager = FileManager.default
    let modelSlug = modelName.replacingOccurrences(of: "openai_whisper-", with: "")
    var roots = Set<URL>()

    for searchBase in modelSearchBases(modelName: modelName, cacheFolder: cacheFolder) {
      guard fileManager.fileExists(atPath: searchBase.path) else { continue }

      if searchBase.lastPathComponent == modelName || pathMatchesModel(searchBase.path, modelName: modelName) {
        roots.insert(searchBase)
      }

      guard let enumerator = fileManager.enumerator(
        at: searchBase,
        includingPropertiesForKeys: [.isDirectoryKey, .fileSizeKey],
        options: [.skipsHiddenFiles],
      ) else {
        continue
      }

      for case let url as URL in enumerator {
        guard url.lastPathComponent == "AudioEncoder.mlmodelc" else { continue }
        let path = url.path
        guard pathMatchesModel(path, modelName: modelName) else { continue }

        var current = url.deletingLastPathComponent()
        while current.path.hasPrefix(searchBase.path), current.path != searchBase.path {
          let name = current.lastPathComponent
          if name == modelName || name.contains(modelSlug) || pathMatchesModel(name, modelName: modelName) {
            roots.insert(current)
            break
          }
          current = current.deletingLastPathComponent()
        }
      }
    }

    return Array(roots)
  }

  private struct DownloadProgressThrottleState {
    private var lastBytesScanAt: TimeInterval = 0
    private var lastBytesOnDisk: Int = 0
    private var lastPhase: String = ""
    private let bytesScanInterval: TimeInterval = 0.5

    mutating func resolvedBytes(
      modelName: String,
      cacheFolder: String,
      fraction: Double,
      phase: String,
    ) -> Int {
      let now = ProcessInfo.processInfo.systemUptime
      let phaseChanged = phase != lastPhase
      let shouldScan = phaseChanged || fraction >= 1.0 || (now - lastBytesScanAt) >= bytesScanInterval

      if shouldScan {
        let bytes = WhisperKitEngine.downloadStorageBytes(modelName: modelName, cacheFolder: cacheFolder)
        lastBytesOnDisk = bytes > 0
          ? bytes
          : WhisperKitEngine.resolvedModelStorageBytes(modelName: modelName, cacheFolder: cacheFolder)
        lastBytesScanAt = now
      }

      lastPhase = phase
      return lastBytesOnDisk
    }
  }

  /// Bytes on disk while download is in progress (includes HF cache and partial model dir).
  fileprivate static func downloadStorageBytes(modelName: String, cacheFolder: String) -> Int {
    let downloadBase = cacheURL(from: cacheFolder)
    let repoRoot = whisperKitRepoRoot(downloadBase: downloadBase)
    let modelDir = huggingFaceModelDir(modelName: modelName, downloadBase: downloadBase)
    let cacheDir = repoRoot.appendingPathComponent(".cache", isDirectory: true)
    let fileManager = FileManager.default
    var total = 0
    if fileManager.fileExists(atPath: modelDir.path) {
      total += directorySizeBytes(at: modelDir)
    }
    if fileManager.fileExists(atPath: cacheDir.path) {
      total += directorySizeBytes(at: cacheDir)
    }
    return total
  }

  private static func resolvedModelStorageBytes(modelName: String, cacheFolder: String) -> Int {
    guard hasCompleteWhisperKitArtifacts(modelName: modelName, cacheFolder: cacheFolder) else {
      return 0
    }

    let roots = findModelRootURLs(modelName: modelName, cacheFolder: cacheFolder)
    if !roots.isEmpty {
      return roots.reduce(0) { partial, url in
        max(partial, directorySizeBytes(at: url))
      }
    }

    let fileManager = FileManager.default
    let modelDir = huggingFaceModelDir(
      modelName: modelName,
      downloadBase: cacheURL(from: cacheFolder),
    )
    if fileManager.fileExists(atPath: modelDir.path) {
      return directorySizeBytes(at: modelDir)
    }

    return 0
  }

  private static func directorySizeBytes(at url: URL) -> Int {
    let fileManager = FileManager.default
    guard let enumerator = fileManager.enumerator(
      at: url,
      includingPropertiesForKeys: [.fileSizeKey, .isDirectoryKey],
      options: [.skipsHiddenFiles],
    ) else {
      return 0
    }

    var total = 0
    for case let item as URL in enumerator {
      guard let values = try? item.resourceValues(forKeys: [.isDirectoryKey, .fileSizeKey]) else {
        continue
      }
      if values.isDirectory != true {
        total += values.fileSize ?? 0
      }
    }
    return total
  }
  #endif
}
