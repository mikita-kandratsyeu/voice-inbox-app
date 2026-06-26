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

  #if canImport(WhisperKit)
  private static var cachedPipeline: WhisperKit?
  private static var cachedModelName: String?

  private static func cacheURL(from path: String) -> URL {
    if path.hasPrefix("file://") {
      return URL(string: path) ?? URL(fileURLWithPath: String(path.dropFirst(7)))
    }
    return URL(fileURLWithPath: path)
  }

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

    let text = first.text.trimmingCharacters(in: .whitespacesAndNewlines)
    var segments: [TranscriptionSegmentPayload] = []
    var index = 0
    for segment in first.segments {
      let startMs = Int(segment.start * 1000)
      let endMs = Int(segment.end * 1000)
      let payload = TranscriptionSegmentPayload(
        id: String(index),
        text: segment.text.trimmingCharacters(in: .whitespacesAndNewlines),
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
  #endif
}
