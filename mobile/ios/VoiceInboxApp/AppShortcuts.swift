import AppIntents

@available(iOS 16.0, *)
struct VoiceInboxAppShortcuts: AppShortcutsProvider {
  @AppShortcutsBuilder
  static var appShortcuts: [AppShortcut] {
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
      systemImageName: "waveform"
    )

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
    )

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
    )
  }
}
