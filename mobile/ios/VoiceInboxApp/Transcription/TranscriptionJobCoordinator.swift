import Foundation

final class TranscriptionJobCoordinator {
  typealias EventEmitter = (
    _ name: String,
    _ body: [String: Any],
  ) -> Void

  private let queue = DispatchQueue(label: "com.voiceinbox.transcription.jobs", qos: .userInitiated)
  private var activeJobs: [String: TranscriptionJobState] = [:]

  private struct TranscriptionJobState {
    var cancelled = false
    var task: Task<Void, Never>?
  }

  func isEngineAvailable() -> Bool {
    WhisperKitEngine.isAvailable()
  }

  func prepareModel(modelName: String, cacheFolder: String, completion: @escaping (Result<Bool, Error>) -> Void) {
    queue.async {
      Task {
        do {
          try await WhisperKitEngine.prepare(modelName: modelName, cacheFolder: cacheFolder)
          completion(.success(true))
        } catch {
          completion(.failure(error))
        }
      }
    }
  }

  func isModelDownloaded(modelName: String, cacheFolder: String, completion: @escaping (Bool) -> Void) {
    queue.async {
      completion(WhisperKitEngine.isModelCached(modelName: modelName, cacheFolder: cacheFolder))
    }
  }

  func getModelStorageBytes(modelName: String, cacheFolder: String, completion: @escaping (Int) -> Void) {
    queue.async {
      completion(WhisperKitEngine.getModelStorageBytes(modelName: modelName, cacheFolder: cacheFolder))
    }
  }

  func deleteModel(modelName: String, cacheFolder: String, completion: @escaping (Result<Void, Error>) -> Void) {
    queue.async {
      do {
        try WhisperKitEngine.deleteModel(modelName: modelName, cacheFolder: cacheFolder)
        completion(.success(()))
      } catch {
        completion(.failure(error))
      }
    }
  }

  func isSpeakerKitDownloaded(cacheFolder: String, completion: @escaping (Bool) -> Void) {
    queue.async {
      completion(SpeakerKitEngine.isModelCached(cacheFolder: cacheFolder))
    }
  }

  func getSpeakerKitStorageBytes(cacheFolder: String, completion: @escaping (Int) -> Void) {
    queue.async {
      completion(SpeakerKitEngine.getStorageBytes(cacheFolder: cacheFolder))
    }
  }

  func deleteSpeakerKitModel(cacheFolder: String, completion: @escaping (Result<Void, Error>) -> Void) {
    queue.async {
      do {
        try SpeakerKitEngine.deleteModel(cacheFolder: cacheFolder)
        completion(.success(()))
      } catch {
        completion(.failure(error))
      }
    }
  }

  func startJob(
    request: TranscriptionJobRequest,
    emit: @escaping EventEmitter,
    completion: @escaping (Result<Void, Error>) -> Void,
  ) {
    queue.async { [weak self] in
      guard let self else { return }
      if self.activeJobs[request.jobId] != nil {
        completion(.failure(TranscriptionJobError.unknown("job_already_running")))
        return
      }

      var state = TranscriptionJobState()
      state.task = Task {
        do {
          try await self.runJob(request: request, emit: emit)
          completion(.success(()))
        } catch {
          if (error as? TranscriptionJobError) == .cancelled {
            emit("transcriptionCancelled", [
              "jobId": request.jobId,
              "checkpointAvailable": true,
            ])
          } else {
            let mapped = mapTranscriptionFailure(error)
            emit("transcriptionFailed", [
              "jobId": request.jobId,
              "code": mapped.code,
              "message": mapped.message,
            ])
          }
          completion(.failure(error))
        }
        self.queue.async {
          self.activeJobs.removeValue(forKey: request.jobId)
        }
      }
      self.activeJobs[request.jobId] = state
    }
  }

  func cancelJob(jobId: String) {
    queue.async {
      guard let state = self.activeJobs[jobId] else { return }
      var next = state
      next.cancelled = true
      self.activeJobs[jobId] = next
      next.task?.cancel()
    }
  }

  func cleanupJob(jobId: String) {
    let jobDir = TranscriptionTempFileManager.jobDirectory(jobId: jobId)
    try? FileManager.default.removeItem(at: jobDir)
  }

  private func isCancelled(jobId: String) -> Bool {
    activeJobs[jobId]?.cancelled == true || Task.isCancelled
  }

  private func emitProgress(
    request: TranscriptionJobRequest,
    emit: EventEmitter,
    phase: String,
    progress: Int,
    currentChunk: Int? = nil,
    totalChunks: Int? = nil,
    partialSegments: [[String: Any]]? = nil,
  ) {
    var body: [String: Any] = [
      "jobId": request.jobId,
      "phase": phase,
      "progress": progress,
    ]
    if let currentChunk { body["currentChunk"] = currentChunk }
    if let totalChunks { body["totalChunks"] = totalChunks }
    if let partialSegments { body["partialSegments"] = partialSegments }
    emit("transcriptionProgress", body)
  }

  private func runJob(request: TranscriptionJobRequest, emit: EventEmitter) async throws {
    guard WhisperKitEngine.isAvailable() else {
      throw TranscriptionJobError.modelUnavailable
    }

    emitProgress(request: request, emit: emit, phase: "modelLoading", progress: 5)
    try await WhisperKitEngine.prepare(modelName: request.whisperKitModel, cacheFolder: request.modelCachePath)
    if request.diarization, SpeakerKitEngine.isAvailable() {
      do {
        try await SpeakerKitEngine.prepare(cacheFolder: speakerKitCachePath(for: request))
      } catch {
        NSLog(
          "[Transcription] SpeakerKit model prepare failed, diarization may be skipped: %@",
          error.localizedDescription,
        )
      }
    }
    if isCancelled(jobId: request.jobId) { throw TranscriptionJobError.cancelled }

    emitProgress(request: request, emit: emit, phase: "normalizing", progress: 10)
    let jobDir = TranscriptionTempFileManager.ensureJobDirectory(jobId: request.jobId)
    let normalizedPath = jobDir.appendingPathComponent("normalized.wav").path
    let sourcePath = request.audioPath.hasPrefix("file://")
      ? String(request.audioPath.dropFirst(7))
      : request.audioPath

    guard FileManager.default.fileExists(atPath: sourcePath) else {
      throw TranscriptionJobError.audioMissing
    }

    _ = try AudioNormalizer.normalizeToWav(inputPath: sourcePath, outputPath: normalizedPath)

    if isCancelled(jobId: request.jobId) { throw TranscriptionJobError.cancelled }

    var diarization: [DiarizationTurnPayload] = []
    if request.diarization {
      emitProgress(request: request, emit: emit, phase: "diarizing", progress: 20)
      if SpeakerKitEngine.isAvailable(), request.durationMs <= 90 * 60 * 1000 {
        let speakerKitFolder = speakerKitCachePath(for: request)
        do {
          diarization = try await SpeakerKitEngine.diarize(
            audioPath: normalizedPath,
            maxSpeakers: request.maxSpeakers,
            cacheFolder: speakerKitFolder,
          )
        } catch {
          NSLog(
            "[Transcription] Diarization failed, continuing without speaker labels: %@",
            error.localizedDescription,
          )
          diarization = []
        }
      }
    }

    let chunks = buildChunkPlan(
      durationMs: request.durationMs,
      chunkDurationSec: request.chunkDurationSec,
      chunkOverlapSec: request.chunkOverlapSec,
    )
    let totalChunks = max(1, chunks.count)
    let startIndex = request.resume?.startChunkIndex ?? 0
    var fullText = request.resume?.fullText ?? ""
    var allSegments: [TranscriptionSegmentPayload] = []

    if let resumeSegments = request.resume?.segments {
      allSegments = resumeSegments.compactMap { dict in
        guard
          let id = dict["id"]?.value as? String,
          let text = dict["text"]?.value as? String
        else { return nil }
        let startMs = dict["startMs"]?.value as? Int ?? 0
        let endMs = dict["endMs"]?.value as? Int ?? startMs
        return TranscriptionSegmentPayload(
          id: id,
          text: text,
          startMs: startMs,
          endMs: endMs,
          startTime: formatTimestampMs(startMs),
          speakerId: dict["speakerId"]?.value as? String,
          language: dict["language"]?.value as? String,
          isOverlapping: dict["isOverlapping"]?.value as? Bool,
        )
      }
    }

    let promptTail = fullText.trimmingCharacters(in: .whitespacesAndNewlines)
    let promptPrefix = request.customWords.joined(separator: " ")
    let prompt = [promptPrefix, String(promptTail.suffix(200))].filter { !$0.isEmpty }.joined(separator: " ")

  #if canImport(WhisperKit)
    if totalChunks == 1 || request.durationMs < 30_000 {
      emitProgress(request: request, emit: emit, phase: "transcribingChunk", progress: 40, currentChunk: 1, totalChunks: 1)
      let result = try await WhisperKitEngine.transcribe(
        audioPath: normalizedPath,
        modelName: request.whisperKitModel,
        cacheFolder: request.modelCachePath,
        language: request.language,
        prompt: prompt.isEmpty ? nil : prompt,
      )
      allSegments = result.segments
      fullText = result.text
      if !diarization.isEmpty {
        allSegments = SpeakerKitEngine.applySpeakerInfo(
          transcriptionSegments: allSegments,
          diarization: diarization,
        )
      }
    } else {
      for (loopIndex, chunk) in chunks.enumerated() where loopIndex >= startIndex {
        if isCancelled(jobId: request.jobId) { throw TranscriptionJobError.cancelled }

        let chunkPath = jobDir.appendingPathComponent("chunk-\(chunk.index).wav").path
        try writeWavChunk(
          sourcePath: normalizedPath,
          outputPath: chunkPath,
          startMs: chunk.offsetMs,
          durationMs: chunk.durationMs,
        )

        let progress = 20 + Int((Double(loopIndex + 1) / Double(totalChunks)) * 70.0)
        emitProgress(
          request: request,
          emit: emit,
          phase: "transcribingChunk",
          progress: progress,
          currentChunk: loopIndex + 1,
          totalChunks: totalChunks,
        )

        let chunkPrompt = [prompt, fullText].filter { !$0.isEmpty }.joined(separator: " ")
        let result = try await WhisperKitEngine.transcribe(
          audioPath: chunkPath,
          modelName: request.whisperKitModel,
          cacheFolder: request.modelCachePath,
          language: request.language,
          prompt: chunkPrompt.isEmpty ? nil : chunkPrompt,
        )

        let segmentIdBase = allSegments.count
        let offsetSegments = result.segments.enumerated().map { localIndex, segment in
          TranscriptionSegmentPayload(
            id: String(segmentIdBase + localIndex),
            text: segment.text,
            startMs: segment.startMs + chunk.offsetMs,
            endMs: segment.endMs + chunk.offsetMs,
            startTime: formatTimestampMs(segment.startMs + chunk.offsetMs),
            speakerId: segment.speakerId,
            language: segment.language,
            isOverlapping: segment.isOverlapping,
          )
        }

        allSegments.append(contentsOf: offsetSegments)
        if !result.text.isEmpty {
          fullText = fullText.isEmpty ? result.text : "\(fullText) \(result.text)"
        }

        let payloadSegments = allSegments.map { $0.dictionary }
        emit("transcriptionPartialResult", [
          "jobId": request.jobId,
          "fullText": fullText,
          "segments": payloadSegments,
          "checkpointIndex": loopIndex,
        ])
        try? FileManager.default.removeItem(atPath: chunkPath)
      }

      if !diarization.isEmpty {
        allSegments = SpeakerKitEngine.applySpeakerInfo(
          transcriptionSegments: allSegments,
          diarization: diarization,
        )
      }
    }
  #endif

    emitProgress(request: request, emit: emit, phase: "merging", progress: 95)
    let speakers = buildSpeakerRoster(from: allSegments)
    emit("transcriptionCompleted", [
      "jobId": request.jobId,
      "durationMs": request.durationMs,
      "fullText": fullText,
      "segments": allSegments.map { $0.dictionary },
      "speakers": speakers,
      "skipped": fullText.isEmpty && allSegments.isEmpty,
    ])
    cleanupJob(jobId: request.jobId)
  }

  private func speakerKitCachePath(for request: TranscriptionJobRequest) -> String {
    if let speakerKitCachePath = request.speakerKitCachePath, !speakerKitCachePath.isEmpty {
      return speakerKitCachePath
    }

    let whisperCache = URL(fileURLWithPath: request.modelCachePath)
    return whisperCache
      .deletingLastPathComponent()
      .appendingPathComponent("speakerkit", isDirectory: true)
      .path
  }

  private func buildSpeakerRoster(from segments: [TranscriptionSegmentPayload]) -> [[String: String]] {
    let ids = Array(Set(segments.compactMap { $0.speakerId })).sorted()
    return ids.enumerated().map { index, id in
      ["id": id, "label": "Speaker \(index + 1)"]
    }
  }

  private func writeWavChunk(
    sourcePath: String,
    outputPath: String,
    startMs: Int,
    durationMs: Int,
  ) throws {
    let data = try Data(contentsOf: URL(fileURLWithPath: sourcePath))
    guard data.count > 44 else {
      throw TranscriptionJobError.unknown("invalid_wav")
    }

    let sampleRate = 16_000
    let bytesPerSample = 2
    let startByte = 44 + (startMs * sampleRate * bytesPerSample) / 1000
    let chunkBytes = (durationMs * sampleRate * bytesPerSample) / 1000
    let endByte = min(data.count, startByte + chunkBytes)
    guard startByte < endByte else {
      throw TranscriptionJobError.unknown("invalid_chunk_bounds")
    }

    var header = data.prefix(44)
  #if swift(>=5.0)
    let pcm = data.subdata(in: startByte..<endByte)
    var mutableHeader = Data(header)
    let dataSize = UInt32(pcm.count)
    mutableHeader.replaceSubrange(4..<8, with: withUnsafeBytes(of: (36 + dataSize).littleEndian) { Data($0) })
    mutableHeader.replaceSubrange(40..<44, with: withUnsafeBytes(of: dataSize.littleEndian) { Data($0) })
    var output = Data()
    output.append(mutableHeader)
    output.append(pcm)
    try output.write(to: URL(fileURLWithPath: outputPath), options: .atomic)
  #endif
  }
}

enum TranscriptionTempFileManager {
  static func jobDirectory(jobId: String) -> URL {
    let base = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
    return base.appendingPathComponent("transcription-jobs/\(jobId)", isDirectory: true)
  }

  static func ensureJobDirectory(jobId: String) -> URL {
    let dir = jobDirectory(jobId: jobId)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }
}

extension TranscriptionSegmentPayload {
  var dictionary: [String: Any] {
    var payload: [String: Any] = [
      "id": id,
      "text": text,
      "startMs": startMs,
      "endMs": endMs,
      "startTime": startTime,
    ]
    if let speakerId { payload["speakerId"] = speakerId }
    if let language { payload["language"] = language }
    if let isOverlapping { payload["isOverlapping"] = isOverlapping }
    return payload
  }
}
