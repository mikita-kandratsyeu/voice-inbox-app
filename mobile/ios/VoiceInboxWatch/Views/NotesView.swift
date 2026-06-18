import SwiftUI

struct NotesView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager

    var body: some View {
        NavigationStack {
            Group {
                if let snapshot = sessionManager.snapshot {
                    if snapshot.recentNotes.isEmpty {
                        emptyState
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
                    emptyState
                }
            }
            .navigationTitle("Notes")
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "note.text")
                .font(.system(size: 40))
                .foregroundColor(.secondary)
            Text("No recent notes")
                .font(.caption)
                .foregroundColor(.secondary)
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
                        .foregroundColor(.secondary)
                        .lineLimit(3)
                }

                Text(formatDate(note.createdAt))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .buttonStyle(.plain)
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }

        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .short
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}
