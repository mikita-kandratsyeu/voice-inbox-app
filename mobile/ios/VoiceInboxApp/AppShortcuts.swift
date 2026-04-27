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

@available(iOS 16.0, *)
struct VoiceInboxAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    [
      AppShortcut(
        intent: StartRecordingIntent(),
        phrases: [
          // English
          "Start recording in \(.applicationName)",
          "New voice note in \(.applicationName)",
          "Record in \(.applicationName)",
          "Create voice note in \(.applicationName)",
          "Take a voice note in \(.applicationName)",
          "Open recorder in \(.applicationName)",
          "Start voice memo in \(.applicationName)",
          "Capture note in \(.applicationName)",
          "Quick note in \(.applicationName)",
          // Russian
          "Начать запись в \(.applicationName)",
          "Новая голосовая заметка в \(.applicationName)",
          "Запись в \(.applicationName)",
          "Создать голосовую заметку в \(.applicationName)",
          "Сделать голосовую заметку в \(.applicationName)",
          "Открыть запись в \(.applicationName)",
          "Начать голосовую заметку в \(.applicationName)",
          "Быстрая заметка в \(.applicationName)",
          "Записать заметку в \(.applicationName)",
        ],
        shortTitle: LocalizedStringResource("Start Recording", table: "AppShortcuts"),
        systemImageName: "mic.fill"
      ),
      AppShortcut(
        intent: NewTextNoteIntent(),
        phrases: [
          "New text note in \(.applicationName)",
          "Create text note in \(.applicationName)",
          "Add text note in \(.applicationName)",
          "Text note in \(.applicationName)",
          "Новая текстовая заметка в \(.applicationName)",
          "Текстовая заметка в \(.applicationName)",
          "Создать текстовую заметку в \(.applicationName)",
          "Добавить текстовую заметку в \(.applicationName)",
        ],
        shortTitle: LocalizedStringResource("Text Note", table: "AppShortcuts"),
        systemImageName: "square.and.pencil"
      ),
      AppShortcut(
        intent: OpenAllTasksIntent(),
        phrases: [
          "All tasks in \(.applicationName)",
          "Open tasks in \(.applicationName)",
          "Show tasks in \(.applicationName)",
          "My tasks in \(.applicationName)",
          "Все задачи в \(.applicationName)",
          "Открыть задачи в \(.applicationName)",
          "Показать задачи в \(.applicationName)",
          "Задачи в \(.applicationName)",
        ],
        shortTitle: LocalizedStringResource("All Tasks", table: "AppShortcuts"),
        systemImageName: "checklist"
      ),
    ]
  }
}
