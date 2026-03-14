import ActivityKit
import Foundation

@objc(RecordingLiveActivityModule)
class RecordingLiveActivityModule: NSObject {

    private var currentActivity: Activity<RecordingActivityAttributes>?

    @objc
    func startActivity(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.1, *) else {
            reject("UNAVAILABLE", "Live Activities require iOS 16.1+", nil)
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            reject("DISABLED", "Live Activities are disabled by the user", nil)
            return
        }

        let initialState = RecordingActivityAttributes.ContentState(elapsedSeconds: 0, isStopped: false)
        let attributes = RecordingActivityAttributes()

        do {
            let activity = try Activity<RecordingActivityAttributes>.request(
                attributes: attributes,
                contentState: initialState,
                pushType: nil
            )
            currentActivity = activity
            resolve(activity.id)
        } catch {
            reject("START_FAILED", error.localizedDescription, error)
        }
    }

    @objc
    func updateActivity(_ seconds: Double, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.1, *) else {
            resolve(nil)
            return
        }
        guard let activity = currentActivity else {
            resolve(nil)
            return
        }

        let updatedState = RecordingActivityAttributes.ContentState(
            elapsedSeconds: Int(seconds),
            isStopped: false
        )
        Task {
            await activity.update(using: updatedState)
            resolve(nil)
        }
    }

    @objc
    func endActivity(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.1, *) else {
            resolve(nil)
            return
        }
        guard let activity = currentActivity else {
            resolve(nil)
            return
        }

        let stoppedState = RecordingActivityAttributes.ContentState(elapsedSeconds: 0, isStopped: true)
        Task {
            await activity.update(using: stoppedState)
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            await activity.end(using: stoppedState, dismissalPolicy: .immediate)
            self.currentActivity = nil
            resolve(nil)
        }
    }

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
