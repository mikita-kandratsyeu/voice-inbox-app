import Foundation
import AVFoundation

enum AudioNormalizerError: LocalizedError {
  case fileNotFound
  case conversionFailed(String)

  var errorDescription: String? {
    switch self {
    case .fileNotFound:
      return "audio_file_missing"
    case .conversionFailed(let detail):
      return detail
    }
  }
}

struct AudioNormalizer {
  static let targetSampleRate: Double = 16_000
  static let targetChannels: Int = 1

  static func normalizeToWav(inputPath: String, outputPath: String) throws -> URL {
    let inputURL = resolveFileURL(inputPath)
    let outputURL = resolveFileURL(outputPath)

    guard FileManager.default.fileExists(atPath: inputURL.path) else {
      throw AudioNormalizerError.fileNotFound
    }

    try FileManager.default.createDirectory(
      at: outputURL.deletingLastPathComponent(),
      withIntermediateDirectories: true,
    )

    let asset = AVURLAsset(url: inputURL)
    guard let track = asset.tracks(withMediaType: .audio).first else {
      throw AudioNormalizerError.conversionFailed("no_audio_track")
    }

    let outputSettings: [String: Any] = [
      AVFormatIDKey: kAudioFormatLinearPCM,
      AVSampleRateKey: targetSampleRate,
      AVNumberOfChannelsKey: targetChannels,
      AVLinearPCMBitDepthKey: 16,
      AVLinearPCMIsFloatKey: false,
      AVLinearPCMIsBigEndianKey: false,
      AVLinearPCMIsNonInterleaved: false,
    ]

    let reader = try AVAssetReader(asset: asset)
    let output = AVAssetReaderTrackOutput(track: track, outputSettings: outputSettings)
    output.alwaysCopiesSampleData = false
    reader.add(output)

    guard reader.startReading() else {
      throw AudioNormalizerError.conversionFailed(reader.error?.localizedDescription ?? "reader_start_failed")
    }

    var pcmData = Data()

    while reader.status == .reading {
      guard let sampleBuffer = output.copyNextSampleBuffer() else {
        break
      }

      guard let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else {
        continue
      }

      var length = 0
      var dataPointer: UnsafeMutablePointer<Int8>?
      let status = CMBlockBufferGetDataPointer(
        blockBuffer,
        atOffset: 0,
        lengthAtOffsetOut: nil,
        totalLengthOut: &length,
        dataPointerOut: &dataPointer,
      )

      guard status == kCMBlockBufferNoErr, let dataPointer, length > 0 else {
        continue
      }

      pcmData.append(Data(bytes: dataPointer, count: length))
    }

    if reader.status == .failed {
      throw AudioNormalizerError.conversionFailed(reader.error?.localizedDescription ?? "reader_failed")
    }

    guard !pcmData.isEmpty else {
      throw AudioNormalizerError.conversionFailed("empty_pcm_output")
    }

    try writeWavFile(pcmData: pcmData, to: outputURL, sampleRate: UInt32(targetSampleRate))
    return outputURL
  }

  private static func resolveFileURL(_ path: String) -> URL {
    if path.hasPrefix("file://") {
      return URL(string: path) ?? URL(fileURLWithPath: String(path.dropFirst(7)))
    }
    return URL(fileURLWithPath: path)
  }

  private static func writeWavFile(pcmData: Data, to url: URL, sampleRate: UInt32) throws {
    let channels: UInt16 = 1
    let bitsPerSample: UInt16 = 16
    let byteRate = sampleRate * UInt32(channels) * UInt32(bitsPerSample / 8)
    let blockAlign = channels * (bitsPerSample / 8)
    let dataSize = UInt32(pcmData.count)
    let chunkSize = 36 + dataSize

    var header = Data()
    header.append("RIFF".data(using: .ascii)!)
    header.append(littleEndian: chunkSize)
    header.append("WAVE".data(using: .ascii)!)
    header.append("fmt ".data(using: .ascii)!)
    header.append(littleEndian: UInt32(16))
    header.append(littleEndian: UInt16(1))
    header.append(littleEndian: channels)
    header.append(littleEndian: sampleRate)
    header.append(littleEndian: byteRate)
    header.append(littleEndian: blockAlign)
    header.append(littleEndian: bitsPerSample)
    header.append("data".data(using: .ascii)!)
    header.append(littleEndian: dataSize)

    var fileData = Data()
    fileData.append(header)
    fileData.append(pcmData)
    try fileData.write(to: url, options: .atomic)
  }
}

private extension Data {
  mutating func append(littleEndian value: UInt16) {
    var le = value.littleEndian
    append(UnsafeBufferPointer(start: &le, count: 1))
  }

  mutating func append(littleEndian value: UInt32) {
    var le = value.littleEndian
    append(UnsafeBufferPointer(start: &le, count: 1))
  }
}
