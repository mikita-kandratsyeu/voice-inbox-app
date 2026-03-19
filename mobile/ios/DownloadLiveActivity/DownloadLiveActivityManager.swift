import ActivityKit

@available(iOS 16.2, *)
final class DownloadLiveActivityManager {

    static let shared = DownloadLiveActivityManager()
    private init() {}

    private var activity: Activity<DownloadAttributes>?

  func start(modelId: String, title: String, label: String) throws {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        guard activity == nil else { return }

        let attributes = DownloadAttributes(id: "whisper-\(modelId)")
        let state = DownloadAttributes.ContentState(
            modelId: modelId,
            progress: 0,
            title: title,
            label: label
        )

        let content = ActivityContent(state: state, staleDate: nil)

        activity = try Activity.request(
            attributes: attributes,
            content: content,
            pushType: nil
        ) as Activity<DownloadAttributes>
    }

    func update(progress: Double, title: String, label: String) {
        guard let activity else { return }

        let currentState = activity.content.state
        let state = DownloadAttributes.ContentState(
            modelId: currentState.modelId,
            progress: min(max(progress, 0), 1),
            title: title,
            label: label
        )

        let content = ActivityContent(state: state, staleDate: nil)

        Task {
            await activity.update(content)
        }
    }

    func end() {
        guard let activity else { return }

        let state = activity.content.state
        let content = ActivityContent(state: state, staleDate: nil)

        Task {
            await activity.end(content, dismissalPolicy: .default)
            self.activity = nil
        }
    }
}
