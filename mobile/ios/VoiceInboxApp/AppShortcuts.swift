import AppIntents
import UIKit

@available(iOS 16.0, *)
struct StartRecordingIntent: AppIntent, InstanceDisplayRepresentable {
  static let shortcutSystemImageName = "mic.fill"

  static var title: LocalizedStringResource = LocalizedStringResource(
    "Start Voice Recording",
    table: "AppShortcuts"
  )
  static var description = IntentDescription(
    LocalizedStringResource("Open Voice Inbox AI and start recording a new voice note.", table: "AppShortcuts")
  )

  static var openAppWhenRun: Bool = true

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(
      title: Self.title,
      image: DisplayRepresentation.Image(systemName: Self.shortcutSystemImageName)
    )
  }

  func perform() async throws -> some IntentResult {
    guard let url = URL(string: "voiceinbox://record/start") else {
      return .result()
    }
    await UIApplication.shared.open(url)
    return .result()
  }
}

@available(iOS 16.0, *)
struct VoiceInboxAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: StartRecordingIntent(),
      phrases: [
        // English
        "Start recording in \(.applicationName)",
        "New voice note in \(.applicationName)",
        "Record in \(.applicationName)",
        // Russian
        "Начать запись в \(.applicationName)",
        "Новая голосовая заметка в \(.applicationName)",
        "Запись в \(.applicationName)",
      ],
      shortTitle: LocalizedStringResource("Start Recording", table: "AppShortcuts"),
      systemImageName: "mic.fill"
    )
  }
}
