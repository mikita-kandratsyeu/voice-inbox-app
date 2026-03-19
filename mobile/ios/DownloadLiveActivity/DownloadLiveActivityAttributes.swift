import ActivityKit

struct DownloadAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var modelId: String
        var progress: Double 
        var title: String
    }

    var id: String
}
