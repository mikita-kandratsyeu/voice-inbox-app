import Foundation
import React

@objc(VoiceInboxTranscriptionModule)
class VoiceInboxTranscriptionModule: RCTEventEmitter {
  private let coordinator = TranscriptionJobCoordinator()

  override static func requiresMainQueueSetup() -> Bool {
    false
  }

  override func supportedEvents() -> [String]! {
    [
      "transcriptionProgress",
      "transcriptionPartialResult",
      "transcriptionCompleted",
      "transcriptionFailed",
      "transcriptionCancelled",
      "whisperKitModelDownloadProgress",
      "whisperKitModelDownloadCompleted",
      "whisperKitModelDownloadFailed",
      "whisperKitModelDownloadCancelled",
    ]
  }

  @objc(isAvailable:rejecter:)
  func isAvailable(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    resolve(coordinator.isEngineAvailable())
  }

  @objc(prepareModel:modelCachePath:resolver:rejecter:)
  func prepareModel(
    _ modelName: String,
    modelCachePath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    coordinator.prepareModel(modelName: modelName, cacheFolder: modelCachePath) { result in
      switch result {
      case .success:
        resolve(["ready": true])
      case .failure(let error):
        reject("E_PREPARE", error.localizedDescription, error)
      }
    }
  }

  @objc(isModelDownloaded:modelCachePath:resolver:rejecter:)
  func isModelDownloaded(
    _ modelName: String,
    modelCachePath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    coordinator.isModelDownloaded(modelName: modelName, cacheFolder: modelCachePath) { downloaded in
      resolve(downloaded)
    }
  }

  @objc(getModelStorageBytes:modelCachePath:resolver:rejecter:)
  func getModelStorageBytes(
    _ modelName: String,
    modelCachePath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    coordinator.getModelStorageBytes(modelName: modelName, cacheFolder: modelCachePath) { bytes in
      resolve(bytes)
    }
  }

  @objc(deleteModel:modelCachePath:resolver:rejecter:)
  func deleteModel(
    _ modelName: String,
    modelCachePath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    coordinator.deleteModel(modelName: modelName, cacheFolder: modelCachePath) { result in
      switch result {
      case .success:
        resolve(nil)
      case .failure(let error):
        reject("E_DELETE", error.localizedDescription, error)
      }
    }
  }

  @objc(startModelDownload:modelCachePath:jobId:resolver:rejecter:)
  func startModelDownload(
    _ modelName: String,
    modelCachePath: String,
    jobId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    coordinator.startModelDownload(
      jobId: jobId,
      modelName: modelName,
      cacheFolder: modelCachePath,
      emit: { [weak self] name, body in
        self?.sendEvent(withName: name, body: body)
      },
      completion: { result in
        switch result {
        case .success:
          resolve(["jobId": jobId])
        case .failure(let error):
          if (error as? TranscriptionJobError) == .cancelled {
            resolve(["jobId": jobId, "cancelled": true])
          } else {
            reject("E_DOWNLOAD", error.localizedDescription, error)
          }
        }
      },
    )
  }

  @objc(cancelModelDownload:rejecter:)
  func cancelModelDownload(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    coordinator.cancelModelDownload()
    resolve(nil)
  }

  @objc(isSpeakerKitDownloaded:resolver:rejecter:)
  func isSpeakerKitDownloaded(
    _ speakerKitCachePath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    coordinator.isSpeakerKitDownloaded(cacheFolder: speakerKitCachePath) { downloaded in
      resolve(downloaded)
    }
  }

  @objc(getSpeakerKitStorageBytes:resolver:rejecter:)
  func getSpeakerKitStorageBytes(
    _ speakerKitCachePath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    coordinator.getSpeakerKitStorageBytes(cacheFolder: speakerKitCachePath) { bytes in
      resolve(bytes)
    }
  }

  @objc(deleteSpeakerKitModel:resolver:rejecter:)
  func deleteSpeakerKitModel(
    _ speakerKitCachePath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    coordinator.deleteSpeakerKitModel(cacheFolder: speakerKitCachePath) { result in
      switch result {
      case .success:
        resolve(nil)
      case .failure(let error):
        reject("E_DELETE", error.localizedDescription, error)
      }
    }
  }

  @objc(startTranscriptionJob:resolver:rejecter:)
  func startTranscriptionJob(
    _ options: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    guard
      let jobId = options["jobId"] as? String,
      let audioPath = options["audioPath"] as? String,
      let whisperKitModel = options["whisperKitModel"] as? String,
      let modelCachePath = options["modelCachePath"] as? String
    else {
      reject("E_ARGS", "missing_required_fields", nil)
      return
    }

    let durationMs = (options["durationMs"] as? NSNumber)?.intValue ?? 0
    let language = (options["language"] as? String) ?? "auto"
    let diarization = (options["diarization"] as? Bool) ?? false
    let maxSpeakers = (options["maxSpeakers"] as? NSNumber)?.intValue
    let customWords = (options["customWords"] as? [String]) ?? []
    let chunkDurationSec = (options["chunkDurationSec"] as? NSNumber)?.doubleValue ?? 45
    let chunkOverlapSec = (options["chunkOverlapSec"] as? NSNumber)?.doubleValue ?? 4
    let whisperTask = (options["whisperTask"] as? String) ?? "transcribe"

    var resume: TranscriptionResumeState?
    if let resumeDict = options["resume"] as? [String: Any] {
      let startChunkIndex = (resumeDict["startChunkIndex"] as? NSNumber)?.intValue ?? 0
      let fullText = (resumeDict["fullText"] as? String) ?? ""
      let segments = (resumeDict["segments"] as? [[String: Any]])?.map { dict in
        dict.mapValues { AnyCodable($0) }
      } ?? []
      resume = TranscriptionResumeState(
        startChunkIndex: startChunkIndex,
        fullText: fullText,
        segments: segments,
      )
    }

    let speakerKitCachePath = options["speakerKitCachePath"] as? String

    let request = TranscriptionJobRequest(
      jobId: jobId,
      audioPath: audioPath,
      durationMs: durationMs,
      language: language,
      whisperKitModel: whisperKitModel,
      modelCachePath: modelCachePath,
      speakerKitCachePath: speakerKitCachePath,
      diarization: diarization,
      maxSpeakers: maxSpeakers,
      customWords: customWords,
      chunkDurationSec: chunkDurationSec,
      chunkOverlapSec: chunkOverlapSec,
      whisperTask: whisperTask,
      resume: resume,
    )

    coordinator.startJob(request: request, emit: { [weak self] name, body in
      self?.sendEvent(withName: name, body: body)
    }, completion: { result in
      switch result {
      case .success:
        resolve(["jobId": jobId])
      case .failure(let error):
        if (error as? TranscriptionJobError) == .cancelled {
          resolve(["jobId": jobId, "cancelled": true])
        } else {
          reject("E_JOB", error.localizedDescription, error)
        }
      }
    })
  }

  @objc(cancelTranscriptionJob:resolver:rejecter:)
  func cancelTranscriptionJob(
    _ jobId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    coordinator.cancelJob(jobId: jobId)
    resolve(nil)
  }

  @objc(cleanupTranscriptionJob:resolver:rejecter:)
  func cleanupTranscriptionJob(
    _ jobId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    coordinator.cleanupJob(jobId: jobId)
    resolve(nil)
  }

  @objc(invalidateEngineCaches:rejecter:)
  func invalidateEngineCaches(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
  ) {
    coordinator.invalidateEngineCaches()
    resolve(nil)
  }
}
