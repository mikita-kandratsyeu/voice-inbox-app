import AppIntents
import UIKit

struct StopRecordingIntent: AppIntent {
    static var title: LocalizedStringResource = "Stop Recording"
    static var description = IntentDescription("Stops the current recording and saves it.")

    func perform() async throws -> some IntentResult {
        if let url = URL(string: "voiceinbox://stop-recording") {
            await UIApplication.shared.open(url)
        }
        return .result()
    }
}
