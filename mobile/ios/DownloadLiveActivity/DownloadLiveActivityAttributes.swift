import ActivityKit

struct DownloadAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var modelId: String
        var progress: Double
        var title: String
        var label: String
        var settingsDeeplinkPath: String?
    }

    var id: String
}
