import Foundation
import React
import ActivityKit

@objc(RecordingActivityModule)
class RecordingActivityModule: NSObject {

    @objc static func requiresMainQueueSetup() -> Bool { true }

    @objc(start:title:resolver:rejecter:)
    func start(sessionId: String,
               title: String,
               resolver: @escaping RCTPromiseResolveBlock,
               rejecter: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.2, *) else {
            rejecter("UNSUPPORTED", "iOS < 16.2", nil)
            return
        }

        do {
            try RecordingLiveActivityManager.shared.start(
                sessionId: sessionId,
                title: title
            )
            resolver(nil)
        } catch {
            rejecter("START_ERROR", error.localizedDescription, error)
        }
    }

    @objc(update:elapsedSeconds:title:resolver:rejecter:)
    func update(isRecording: Bool,
                elapsedSeconds: NSNumber,
                title: String,
                resolver: @escaping RCTPromiseResolveBlock,
                rejecter: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.2, *) else {
            rejecter("UNSUPPORTED", "iOS < 16.2", nil)
            return
        }

        RecordingLiveActivityManager.shared.update(
            isRecording: isRecording,
            elapsedSeconds: elapsedSeconds.intValue,
            title: title
        )
        resolver(nil)
    }

    @objc(stop:rejecter:)
    func stop(resolver: @escaping RCTPromiseResolveBlock,
              rejecter: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.2, *) else {
            rejecter("UNSUPPORTED", "iOS < 16.2", nil)
            return
        }

        RecordingLiveActivityManager.shared.end()
        resolver(nil)
    }
}
