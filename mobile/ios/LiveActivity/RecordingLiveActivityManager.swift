import ActivityKit

@available(iOS 16.2, *)
final class RecordingLiveActivityManager {

    static let shared = RecordingLiveActivityManager()
    private init() {}

    private var activity: Activity<RecordingAttributes>?

    func start(sessionId: String, title: String) throws {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

        endAllActivities()

        let attributes = RecordingAttributes(sessionId: sessionId)
        let state = RecordingAttributes.ContentState(
            isRecording: true,
            startDate: Date(),
            elapsedSeconds: 0,
            title: title
        )

        let content = ActivityContent(state: state, staleDate: nil)

        activity = try Activity.request(
            attributes: attributes,
            content: content,
            pushType: nil
        ) as Activity<RecordingAttributes>
    }

    func update(isRecording: Bool, elapsedSeconds: Int, title: String) {
        if activity == nil {
            activity = Activity<RecordingAttributes>.activities.first
        }
        guard let activity else { return }

        let alignedStartDate = Date().addingTimeInterval(-TimeInterval(elapsedSeconds))
        let state = RecordingAttributes.ContentState(
            isRecording: isRecording,
            startDate: alignedStartDate,
            elapsedSeconds: elapsedSeconds,
            title: title
        )

        let content = ActivityContent(state: state, staleDate: nil)

        Task {
            await activity.update(content)
        }
    }

    func end() {
        endAllActivities()
    }

    /// Ends every recording Live Activity owned by this app (e.g. after process kill).
    func endAllActivities(dismissalPolicy: ActivityUIDismissalPolicy = .immediate) {
        let activities = Activity<RecordingAttributes>.activities
        guard !activities.isEmpty else {
            activity = nil
            return
        }

        let semaphore = DispatchSemaphore(value: 0)
        Task {
            for existing in activities {
                await existing.end(nil, dismissalPolicy: dismissalPolicy)
            }
            activity = nil
            semaphore.signal()
        }
        _ = semaphore.wait(timeout: .now() + 2)
    }
}
