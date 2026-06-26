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
    _ = try await loadPipeline(modelName: modelName, cacheFolder: cacheFolder)
    #else
    throw TranscriptionJobError.modelUnavailable
    #endif
  }

  static func isModelCached(modelName: String, cacheFolder: String) -> Bool {
    #if canImport(WhisperKit)
    return !findModelRootURLs(modelName: modelName, cacheFolder: cacheFolder).isEmpty
    #else
    return false
    #endif
  }

  static func getModelStorageBytes(modelName: String, cacheFolder: String) -> Int {
    #if canImport(WhisperKit)
    return findModelRootURLs(modelName: modelName, cacheFolder: cacheFolder).reduce(0) { partial, url in
      partial + directorySizeBytes(at: url)
    }
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
  private static var cachedPipeline: WhisperKit?
  private static var cachedModelName: String?

  private static func loadPipeline(modelName: String, cacheFolder: String) async throws -> WhisperKit {
    if let cachedPipeline, cachedModelName == modelName {
      return cachedPipeline
    }

    let config = WhisperKitConfig(
      model: modelName,
      downloadBase: cacheURL(from: cacheFolder),
      verbose: false,
      logLevel: .none,
      load: true,
    )
    let pipeline = try await WhisperKit(config)
    cachedPipeline = pipeline
    cachedModelName = modelName
    return pipeline
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

  private static func findModelRootURLs(modelName: String, cacheFolder: String) -> [URL] {
    let base = cacheURL(from: cacheFolder)
    let fileManager = FileManager.default
    guard fileManager.fileExists(atPath: base.path) else {
      return []
    }

    guard let enumerator = fileManager.enumerator(
      at: base,
      includingPropertiesForKeys: [.isDirectoryKey, .fileSizeKey],
      options: [.skipsHiddenFiles],
    ) else {
      return []
    }

    let modelSlug = modelName.replacingOccurrences(of: "openai_whisper-", with: "")
    var roots = Set<URL>()

    for case let url as URL in enumerator {
      guard url.lastPathComponent == "AudioEncoder.mlmodelc" else { continue }
      let path = url.path
      guard pathMatchesModel(path, modelName: modelName) else { continue }

      var current = url.deletingLastPathComponent()
      while current.path.hasPrefix(base.path), current.path != base.path {
        let name = current.lastPathComponent
        if name == modelName || name.contains(modelSlug) || pathMatchesModel(name, modelName: modelName) {
          roots.insert(current)
          break
        }
        current = current.deletingLastPathComponent()
      }
    }

    return Array(roots)
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
