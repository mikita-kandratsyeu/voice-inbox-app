import Foundation

struct TranscriptionChunkPlan: Codable {
  let index: Int
  let offsetMs: Int
  let durationMs: Int
}

struct TranscriptionJobRequest: Codable {
  let jobId: String
  let audioPath: String
  let durationMs: Int
  let language: String
  let whisperKitModel: String
  let modelCachePath: String
  let speakerKitCachePath: String?
  let diarization: Bool
  let maxSpeakers: Int?
  let customWords: [String]
  let chunkDurationSec: Double
  let chunkOverlapSec: Double
  let resume: TranscriptionResumeState?
}

struct TranscriptionResumeState: Codable {
  let startChunkIndex: Int
  let fullText: String
  let segments: [[String: AnyCodable]]
}

struct TranscriptionSegmentPayload: Codable {
  let id: String
  let text: String
  let startMs: Int
  let endMs: Int
  let startTime: String
  let speakerId: String?
  let language: String?
  let isOverlapping: Bool?
}

struct DiarizationTurnPayload: Codable {
  let speakerId: String
  let startMs: Int
  let endMs: Int
  let confidence: Double?
}

enum TranscriptionJobError: LocalizedError, Equatable {
  case cancelled
  case modelUnavailable
  case audioMissing
  case diarizationUnavailable
  case unknown(String)

  var errorDescription: String? {
    switch self {
    case .cancelled:
      return "native_abort"
    case .modelUnavailable:
      return "model_missing"
    case .audioMissing:
      return "audio_missing"
    case .diarizationUnavailable:
      return "diarization_unavailable"
    case .unknown(let message):
      return message
    }
  }
}

struct AnyCodable: Codable {
  let value: Any

  init(_ value: Any) {
    self.value = value
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    if let string = try? container.decode(String.self) {
      value = string
    } else if let int = try? container.decode(Int.self) {
      value = int
    } else if let double = try? container.decode(Double.self) {
      value = double
    } else if let bool = try? container.decode(Bool.self) {
      value = bool
    } else if let array = try? container.decode([AnyCodable].self) {
      value = array.map { $0.value }
    } else if let dict = try? container.decode([String: AnyCodable].self) {
      value = dict.mapValues { $0.value }
    } else {
      value = NSNull()
    }
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()
    switch value {
    case let string as String:
      try container.encode(string)
    case let int as Int:
      try container.encode(int)
    case let double as Double:
      try container.encode(double)
    case let bool as Bool:
      try container.encode(bool)
    default:
      try container.encodeNil()
    }
  }
}

func formatTimestampMs(_ startMs: Int) -> String {
  let totalSeconds = max(0, startMs / 1000)
  let minutes = totalSeconds / 60
  let seconds = totalSeconds % 60
  return String(format: "%02d:%02d", minutes, seconds)
}

func buildChunkPlan(
  durationMs: Int,
  chunkDurationSec: Double,
  chunkOverlapSec: Double,
) -> [TranscriptionChunkPlan] {
  let totalSec = max(0, Double(durationMs) / 1000.0)
  if totalSec <= 0 {
    return []
  }

  let chunkSec = max(5, chunkDurationSec)
  let overlapSec = max(0, min(chunkOverlapSec, chunkSec / 2))
  var chunks: [TranscriptionChunkPlan] = []
  var offsetSec = 0.0
  var index = 0

  while offsetSec < totalSec {
    let remaining = totalSec - offsetSec
    let duration = min(chunkSec, remaining)
    chunks.append(
      TranscriptionChunkPlan(
        index: index,
        offsetMs: Int(offsetSec * 1000),
        durationMs: max(1, Int(duration * 1000)),
      ),
    )
    if offsetSec + duration >= totalSec {
      break
    }
    offsetSec += max(0, duration - overlapSec)
    index += 1
  }

  return chunks
}

func mapTranscriptionFailure(_ error: Error) -> (code: String, message: String) {
  if let jobError = error as? TranscriptionJobError, let code = jobError.errorDescription {
    return (code, error.localizedDescription)
  }

  let description = error.localizedDescription
  let lower = description.lowercased()

  if lower.contains("cancel") || lower.contains("abort") {
    return ("native_abort", description)
  }
  if
    lower.contains("audio") ||
    lower.contains("enoent") ||
    (lower.contains("file") && lower.contains("not found")) ||
    lower.contains("audio_file_missing")
  {
    return ("audio_missing", description)
  }
  if
    lower.contains("model") &&
    (lower.contains("not found") || lower.contains("unavailable") || lower.contains("failed to load"))
  {
    return ("model_load_failed", description)
  }

  return ("unknown", description)
}
