import AppIntents
import UIKit

@available(iOS 16.0, *)
struct StartRecordingIntent: AppIntent, InstanceDisplayRepresentable {
  static let shortcutSystemImageName = "waveform"

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
struct NewTextNoteIntent: AppIntent, InstanceDisplayRepresentable {
  static let shortcutSystemImageName = "square.and.pencil"

  static var title: LocalizedStringResource = LocalizedStringResource(
    "New Text Note",
    table: "AppShortcuts"
  )
  static var description = IntentDescription(
    LocalizedStringResource("Open Voice Inbox AI and create a new text note.", table: "AppShortcuts")
  )

  static var openAppWhenRun: Bool = true

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(
      title: Self.title,
      image: DisplayRepresentation.Image(systemName: Self.shortcutSystemImageName)
    )
  }

  func perform() async throws -> some IntentResult {
    guard let url = URL(string: "voiceinbox://note/text") else {
      return .result()
    }
    await UIApplication.shared.open(url)
    return .result()
  }
}

@available(iOS 16.0, *)
struct OpenAllTasksIntent: AppIntent, InstanceDisplayRepresentable {
  static let shortcutSystemImageName = "checklist"

  static var title: LocalizedStringResource = LocalizedStringResource(
    "All Tasks",
    table: "AppShortcuts"
  )
  static var description = IntentDescription(
    LocalizedStringResource("Open Voice Inbox AI and view tasks from your notes.", table: "AppShortcuts")
  )

  static var openAppWhenRun: Bool = true

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(
      title: Self.title,
      image: DisplayRepresentation.Image(systemName: Self.shortcutSystemImageName)
    )
  }

  func perform() async throws -> some IntentResult {
    guard let url = URL(string: "voiceinbox://tasks") else {
      return .result()
    }
    await UIApplication.shared.open(url)
    return .result()
  }
}
