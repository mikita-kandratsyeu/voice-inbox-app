import SwiftUI

struct RecordingsQueueView: View {
    @StateObject private var store = PendingRecordingStore.shared
    @EnvironmentObject var sessionManager: WatchSessionManager

    var body: some View {
        NavigationStack {
            Group {
                if store.recordings.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "tray")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text("No recordings")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                } else {
                    List {
                        ForEach(store.recordings) { recording in
                            RecordingRow(recording: recording)
                        }
                        .onDelete(perform: deleteRecordings)
                    }
                }
            }
            .navigationTitle("Queue")
        }
    }

    private func deleteRecordings(at offsets: IndexSet) {
        for index in offsets {
            store.remove(store.recordings[index])
        }
    }
}

struct RecordingRow: View {
    let recording: PendingRecording
    @EnvironmentObject var sessionManager: WatchSessionManager

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(formatDuration(recording.durationSeconds))
                    .font(.headline)

                Text(formatDate(recording.createdAt))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            Spacer()

            statusView
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            if recording.syncState == .failed {
                Button {
                    sessionManager.retryFailedTransfer(recording)
                } label: {
                    Label("Retry", systemImage: "arrow.clockwise")
                }
                .tint(.blue)
            }
        }
    }

    @ViewBuilder
    private var statusView: some View {
        switch recording.syncState {
        case .pending:
            Image(systemName: "clock")
                .foregroundColor(.orange)
        case .syncing:
            ProgressView()
        case .synced:
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
        case .failed:
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.red)
        }
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}
