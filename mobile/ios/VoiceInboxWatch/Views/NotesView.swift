import SwiftUI

struct NotesView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager

    var body: some View {
        NavigationStack {
            Group {
                if let snapshot = sessionManager.snapshot {
                    if snapshot.recentNotes.isEmpty {
                        emptyState(message: NSLocalizedString("watch.notes.empty", comment: ""))
                    } else {
                        List {
                            ForEach(snapshot.recentNotes) { note in
                                NoteRow(note: note, onTap: {
                                    openNote(note)
                                })
                            }
                        }
                    }
                } else {
                    emptyState(message: NSLocalizedString("watch.notes.sync_required", comment: ""))
                }
            }
            .navigationTitle(NSLocalizedString("watch.notes.title", comment: ""))
        }
    }

    private func emptyState(message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "note.text")
                .font(.system(size: 40))
                .foregroundStyle(.secondary)
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private func openNote(_ note: WatchNote) {
        let command = WatchCommand(
            type: .openNote,
            taskId: nil,
            recordId: note.id
        )
        sessionManager.sendCommand(command)
    }
}

struct NoteRow: View {
    let note: WatchNote
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 6) {
                Text(note.title)
                    .font(.headline)
                    .lineLimit(2)

                if !note.summary.isEmpty {
                    Text(note.summary)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }

                Text(WatchDateFormatting.displayFromISO(note.createdAt))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .buttonStyle(.plain)
    }
}
