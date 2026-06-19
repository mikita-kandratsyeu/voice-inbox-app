import SwiftUI
import WatchKit

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
                        .listStyle(.carousel)
                    }
                } else {
                    emptyState(message: NSLocalizedString("watch.notes.sync_required", comment: ""))
                }
            }
            .navigationTitle(NSLocalizedString("watch.notes.title", comment: ""))
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Label(NSLocalizedString("watch.notes.title", comment: ""), systemImage: "note.text")
                        .labelStyle(.iconOnly)
                        .foregroundStyle(.white.opacity(0.8))
                        .font(.system(size: 20))
                }
            }
        }
    }

    private func emptyState(message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "note.text")
                .font(.system(size: 44))
                .foregroundStyle(.blue.opacity(0.6))
                .symbolEffect(.pulse)
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 8)
        }
        .padding(.vertical, 20)
    }

    private func openNote(_ note: WatchNote) {
        WKInterfaceDevice.current().play(.click)

        let command = WatchCommand(
            type: .openNote,
            taskId: nil,
            recordId: note.id
        )
        sessionManager.sendCommand(command)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            WKInterfaceDevice.current().play(.success)
        }
    }
}

struct NoteRow: View {
    let note: WatchNote
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 6) {
                Text(note.title)
                    .font(.system(size: 16, weight: .semibold))
                    .lineLimit(2)
                    .minimumScaleFactor(0.9)
                    .multilineTextAlignment(.leading)

                if !note.summary.isEmpty {
                    Text(note.summary)
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .minimumScaleFactor(0.9)
                        .multilineTextAlignment(.leading)
                }

                Text(WatchDateFormatting.displayFromISO(note.createdAt))
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }
}
