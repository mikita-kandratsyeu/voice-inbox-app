import ActivityKit

@available(iOS 16.2, *)
final class RecordingLiveActivityManager {

    static let shared = RecordingLiveActivityManager()
    private init() {}

    private var activity: Activity<RecordingAttributes>?

    func start(sessionId: String, title: String) throws {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

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
        guard let activity else { return }
      
        let currentState = activity.content.state
        let now = Date()
        let alignedStartDate = now.addingTimeInterval(-TimeInterval(elapsedSeconds))
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
        guard let activity else { return }

        let currentState = activity.content.state
        let finalState = RecordingAttributes.ContentState(
            isRecording: false,
            startDate: currentState.startDate,
            elapsedSeconds: currentState.elapsedSeconds,
            title: currentState.title
        )
        let content = ActivityContent(state: finalState, staleDate: nil)

        Task {
            await activity.end(content, dismissalPolicy: .immediate)
            self.activity = nil
        }
    }
}
