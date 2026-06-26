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

  static func diarize(
    audioPath: String,
    maxSpeakers: Int?,
    cacheFolder: String,
  ) async throws -> [DiarizationTurnPayload] {
    #if canImport(SpeakerKit) && canImport(WhisperKit)
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
    #else
    throw TranscriptionJobError.diarizationUnavailable
    #endif
  }

  #if canImport(SpeakerKit) && canImport(WhisperKit)
  private static var cachedSpeakerKit: SpeakerKit?
  private static var cachedSpeakerKitCacheFolder: String?

  private static func loadSpeakerKit(cacheFolder: String) async throws -> SpeakerKit {
    if let cachedSpeakerKit, cachedSpeakerKitCacheFolder == cacheFolder {
      return cachedSpeakerKit
    }

    // Use downloadBase (not modelFolder) so HuggingFace models are fetched on first run.
    let config = PyannoteConfig(
      downloadBase: cacheFolder,
      download: true,
      verbose: false,
      logLevel: .none,
    )
    let speakerKit = try await SpeakerKit(config)
    cachedSpeakerKit = speakerKit
    cachedSpeakerKitCacheFolder = cacheFolder
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
