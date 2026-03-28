import Foundation
import React
import ActivityKit

@objc(DownloadActivityModule)
class DownloadActivityModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc(start:modelId:title:label:activityKindPrefix:settingsDeeplinkPath:resolver:rejecter:)
  func start(
    sessionId: String,
    modelId: String,
    title: String,
    label: String,
    activityKindPrefix: String,
    settingsDeeplinkPath: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      rejecter("UNSUPPORTED", "iOS < 16.2", nil)
      return
    }

    do {
      try DownloadLiveActivityManager.shared.start(
        modelId: modelId,
        title: title,
        label: label,
        activityKindPrefix: activityKindPrefix,
        settingsDeeplinkPath: settingsDeeplinkPath
      )
      resolver(nil)
    } catch {
      rejecter("START_ERROR", error.localizedDescription, error)
    }
  }

  @objc(update:title:label:resolver:rejecter:)
  func update(
    progress: NSNumber,
    title: NSString,
    label: NSString,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      rejecter("UNSUPPORTED", "iOS < 16.2", nil)
      return
    }

    DownloadLiveActivityManager.shared.update(
      progress: progress.doubleValue,
      title: title as String,
      label: label as String
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
