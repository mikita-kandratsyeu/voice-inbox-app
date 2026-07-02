import Foundation

#if canImport(SpeakerKit)
import SpeakerKit
#endif

#if canImport(WhisperKit)
import WhisperKit
#endif

enum SpeakerKitEngine {
  static func isAvailable() -> Bool {
    #if canImport(SpeakerKit)
    return true
    #else
    return false
    #endif
  }

  static func prepare(cacheFolder: String) async throws {
    #if canImport(SpeakerKit) && canImport(WhisperKit)
    _ = try await loadSpeakerKit(cacheFolder: cacheFolder)
    #else
    throw TranscriptionJobError.diarizationUnavailable
    #endif
  }

  static func isModelCached(cacheFolder: String) -> Bool {
    #if canImport(SpeakerKit) && canImport(WhisperKit)
    return hasValidSpeakerKitArtifacts(cacheFolder: cacheFolder)
    #else
    return false
    #endif
  }

  static func getStorageBytes(cacheFolder: String) -> Int {
    #if canImport(SpeakerKit) && canImport(WhisperKit)
    return directorySizeBytes(at: cacheURL(from: cacheFolder))
    #else
    return 0
    #endif
  }

  static func invalidatePipelineCache() {
    #if canImport(SpeakerKit) && canImport(WhisperKit)
    cachedSpeakerKit = nil
    cachedSpeakerKitCacheFolder = nil
    #endif
  }

  static func deleteModel(cacheFolder: String) throws {
    #if canImport(SpeakerKit) && canImport(WhisperKit)
    let url = cacheURL(from: cacheFolder)
    let fileManager = FileManager.default
    if fileManager.fileExists(atPath: url.path) {
      try fileManager.removeItem(at: url)
    }
    cachedSpeakerKit = nil
    cachedSpeakerKitCacheFolder = nil
    #else
    throw TranscriptionJobError.diarizationUnavailable
    #endif
  }

  static func diarize(
    audioPath: String,
    maxSpeakers: Int?,
    cacheFolder: String,
  ) async throws -> [DiarizationTurnPayload] {
    #if canImport(SpeakerKit) && canImport(WhisperKit)
    do {
      return try await performDiarize(
        audioPath: audioPath,
        maxSpeakers: maxSpeakers,
        cacheFolder: cacheFolder,
      )
    } catch {
      guard isSpeakerKitModelLoadError(error) else {
        throw error
      }
      NSLog(
        "[VoiceDiarization] diarize failed with model load error, purging cache and retrying once: %@",
        error.localizedDescription,
      )
      try purgeSpeakerKitCache(cacheFolder: cacheFolder)
      return try await performDiarize(
        audioPath: audioPath,
        maxSpeakers: maxSpeakers,
        cacheFolder: cacheFolder,
      )
    }
    #else
    throw TranscriptionJobError.diarizationUnavailable
    #endif
  }

  #if canImport(SpeakerKit) && canImport(WhisperKit)
  private static let minimumPldaWeightsBytes = 512
  private static var cachedSpeakerKit: SpeakerKit?
  private static var cachedSpeakerKitCacheFolder: String?

  private static func performDiarize(
    audioPath: String,
    maxSpeakers: Int?,
    cacheFolder: String,
  ) async throws -> [DiarizationTurnPayload] {
    let speakerKit = try await loadSpeakerKit(cacheFolder: cacheFolder)
    let audioArray = try AudioProcessor.loadAudioAsFloatArray(fromPath: audioPath)

    var options = PyannoteDiarizationOptions()
    if let maxSpeakers, maxSpeakers > 0 {
      options.numberOfSpeakers = maxSpeakers
    }

    let result = try await speakerKit.diarize(audioArray: audioArray, options: options)
    return result.segments.compactMap { segment in
      guard let speakerId = speakerIdString(from: segment.speaker) else {
        return nil
      }
      return DiarizationTurnPayload(
        speakerId: speakerId,
        startMs: Int(segment.startTime * 1000),
        endMs: Int(segment.endTime * 1000),
        confidence: nil,
      )
    }
  }

  private static func cacheURL(from path: String) -> URL {
    if path.hasPrefix("file://") {
      return URL(string: path) ?? URL(fileURLWithPath: String(path.dropFirst(7)))
    }
    return URL(fileURLWithPath: path)
  }

  private static func speakerKitRepoRoot(cacheFolder: String) -> URL {
    cacheURL(from: cacheFolder)
      .appendingPathComponent("models/argmaxinc/speakerkit-coreml", isDirectory: true)
  }

  private static func findNamedModelDirectory(named name: String, under root: URL) -> URL? {
    guard let enumerator = FileManager.default.enumerator(
      at: root,
      includingPropertiesForKeys: [.isDirectoryKey],
      options: [.skipsHiddenFiles],
    ) else {
      return nil
    }

    for case let item as URL in enumerator {
      if item.lastPathComponent == name {
        return item
      }
    }
    return nil
  }

  private static func hasValidSpeakerKitArtifacts(cacheFolder: String) -> Bool {
    let repoRoot = speakerKitRepoRoot(cacheFolder: cacheFolder)
    guard FileManager.default.fileExists(atPath: repoRoot.path) else {
      return false
    }

    guard
      let pldaBundle = findNamedModelDirectory(named: "PldaProjector.mlmodelc", under: repoRoot)
    else {
      return false
    }

    let weightsDir = pldaBundle.appendingPathComponent("weights", isDirectory: true)
    guard FileManager.default.fileExists(atPath: weightsDir.path) else {
      return false
    }

    let weightsBytes = directorySizeBytes(at: weightsDir)
    if weightsBytes < minimumPldaWeightsBytes {
      NSLog(
        "[VoiceDiarization] SpeakerKit cache invalid: PldaProjector weights=%d bytes (min %d)",
        weightsBytes,
        minimumPldaWeightsBytes,
      )
      return false
    }

    guard
      findNamedModelDirectory(named: "SpeakerSegmenter.mlmodelc", under: repoRoot) != nil,
      findNamedModelDirectory(named: "SpeakerEmbedder.mlmodelc", under: repoRoot) != nil
    else {
      return false
    }

    return true
  }

  private static func directorySizeBytes(at url: URL) -> Int {
    let fileManager = FileManager.default
    guard fileManager.fileExists(atPath: url.path) else {
      return 0
    }

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

  private static func isSpeakerKitModelLoadError(_ error: Error) -> Bool {
    let message = error.localizedDescription.lowercased()
    return message.contains("compile the model")
      || message.contains("unable to load model")
      || message.contains("mlmodel")
  }

  private static func purgeSpeakerKitCache(cacheFolder: String) throws {
    invalidatePipelineCache()
    try deleteModel(cacheFolder: cacheFolder)
  }

  private static func loadSpeakerKit(cacheFolder: String, allowCacheRepair: Bool = true) async throws -> SpeakerKit {
    if let cachedSpeakerKit, cachedSpeakerKitCacheFolder == cacheFolder {
      return cachedSpeakerKit
    }

    if !hasValidSpeakerKitArtifacts(cacheFolder: cacheFolder), allowCacheRepair {
      NSLog("[VoiceDiarization] SpeakerKit cache incomplete, purging before download")
      try? purgeSpeakerKitCache(cacheFolder: cacheFolder)
    }

    do {
      let speakerKit = try await createAndWarmSpeakerKit(cacheFolder: cacheFolder)
      cachedSpeakerKit = speakerKit
      cachedSpeakerKitCacheFolder = cacheFolder
      return speakerKit
    } catch {
      guard allowCacheRepair, isSpeakerKitModelLoadError(error) else {
        throw error
      }
      NSLog(
        "[VoiceDiarization] SpeakerKit warm load failed, purging cache and retrying once: %@",
        error.localizedDescription,
      )
      try purgeSpeakerKitCache(cacheFolder: cacheFolder)
      let speakerKit = try await createAndWarmSpeakerKit(cacheFolder: cacheFolder)
      cachedSpeakerKit = speakerKit
      cachedSpeakerKitCacheFolder = cacheFolder
      return speakerKit
    }
  }

  private static func createAndWarmSpeakerKit(cacheFolder: String) async throws -> SpeakerKit {
    let config = PyannoteConfig(
      downloadBase: cacheFolder,
      download: true,
      load: false,
      verbose: false,
      logLevel: .none,
    )
    let speakerKit = try await SpeakerKit(config)
    try await speakerKit.ensureModelsLoaded()
    return speakerKit
  }

  private static func speakerIdString(from speaker: SpeakerInfo) -> String? {
    switch speaker {
    case .speakerId(let id):
      return "speaker_\(id)"
    case .multiple(let ids):
      guard !ids.isEmpty else { return nil }
      if ids.count == 1 {
        return "speaker_\(ids[0])"
      }
      return "speaker_\(ids.map(String.init).joined(separator: "_"))"
    case .noMatch:
      return nil
    }
  }

  static func applySpeakerInfo(
    transcriptionSegments: [TranscriptionSegmentPayload],
    diarization: [DiarizationTurnPayload],
  ) -> [TranscriptionSegmentPayload] {
    return transcriptionSegments.map { segment in
      let overlaps = diarization.map { turn -> (String, Int) in
        let overlap = max(
          0,
          min(segment.endMs, turn.endMs) - max(segment.startMs, turn.startMs),
        )
        return (turn.speakerId, overlap)
      }.sorted { $0.1 > $1.1 }

      guard let best = overlaps.first, best.1 > 0 else {
        return segment
      }

      let second = overlaps.count > 1 ? overlaps[1] : nil
      let isOverlapping =
        second != nil && second!.1 >= 120 && best.1 - second!.1 <= 80

      return TranscriptionSegmentPayload(
        id: segment.id,
        text: segment.text,
        startMs: segment.startMs,
        endMs: segment.endMs,
        startTime: segment.startTime,
        speakerId: best.0,
        language: segment.language,
        isOverlapping: isOverlapping,
      )
    }
  }
  #endif
}
