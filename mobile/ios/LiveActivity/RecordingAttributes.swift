import Foundation
import ActivityKit

struct RecordingAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var isRecording: Bool
        var startDate: Date
        var elapsedSeconds: Int
        var title: String
    }

    var sessionId: String
}
