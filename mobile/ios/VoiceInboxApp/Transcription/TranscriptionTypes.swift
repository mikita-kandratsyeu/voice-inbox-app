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

private struct ChunkWordSpan {
  let text: String
  let normalized: String
}

private func normalizeChunkToken(_ value: String) -> String {
  let lowered = value.lowercased()
  let stripped = lowered.unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) }.map(String.init).joined()
  return stripped
}

private func extractChunkWordSpans(_ value: String) -> [ChunkWordSpan] {
  guard let regex = try? NSRegularExpression(
    pattern: "[\\p{L}\\p{N}]+(?:[''][\\p{L}\\p{N}]+)*",
    options: [],
  ) else {
    return []
  }

  let nsValue = value as NSString
  let range = NSRange(location: 0, length: nsValue.length)
  let matches = regex.matches(in: value, options: [], range: range)

  return matches.compactMap { match in
    guard match.numberOfRanges > 0 else { return nil }
    let tokenRange = match.range(at: 0)
    let token = nsValue.substring(with: tokenRange)
    let normalized = normalizeChunkToken(token)
    guard !normalized.isEmpty else { return nil }
    return ChunkWordSpan(text: token, normalized: normalized)
  }
}

/// Removes duplicated prefix from the next chunk when it repeats the tail of the previous chunk.
func dedupeChunkTextOverlap(previousText: String, nextText: String) -> String {
  let trimmedNext = nextText.trimmingCharacters(in: .whitespacesAndNewlines)
  if trimmedNext.isEmpty {
    return ""
  }

  let previousSpans = extractChunkWordSpans(previousText)
  let nextSpans = extractChunkWordSpans(trimmedNext)
  let previousTokens = previousSpans.map(\.normalized)
  let nextTokens = nextSpans.map(\.normalized)

  if previousTokens.isEmpty || nextTokens.isEmpty {
    return trimmedNext
  }

  let maxOverlap = min(previousTokens.count, nextTokens.count, 12)
  if maxOverlap >= 2 {
    for overlap in stride(from: maxOverlap, through: 2, by: -1) {
      let previousTail = previousTokens.suffix(overlap)
      let nextHead = nextTokens.prefix(overlap)
      if zip(previousTail, nextHead).allSatisfy({ $0 == $1 }) {
        let remaining = nextSpans.dropFirst(overlap).map(\.text).joined(separator: " ")
        return remaining.trimmingCharacters(in: .whitespacesAndNewlines)
      }
    }
  }

  return trimmedNext
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
