import Foundation
import React
import ActivityKit

@objc(DownloadActivityModule)
class DownloadActivityModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc(start:modelId:title:resolver:rejecter:)
  func start(
    sessionId: String,
    modelId: String,
    title: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      rejecter("UNSUPPORTED", "iOS < 16.2", nil)
      return
    }

    do {
      try DownloadLiveActivityManager.shared.start(modelId: modelId, title: title)
      resolver(nil)
    } catch {
      rejecter("START_ERROR", error.localizedDescription, error)
    }
  }

  @objc(update:title:resolver:rejecter:)
  func update(
    progress: NSNumber,
    title: NSString,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      rejecter("UNSUPPORTED", "iOS < 16.2", nil)
      return
    }

    DownloadLiveActivityManager.shared.update(
      progress: progress.doubleValue,
      title: title as String
    )
    resolver(nil)
  }

  @objc(stop:rejecter:)
  func stop(
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      rejecter("UNSUPPORTED", "iOS < 16.2", nil)
      return
    }

    DownloadLiveActivityManager.shared.end()
    resolver(nil)
  }
}
