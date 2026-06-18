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
                            .foregroundStyle(.secondary)
                        Text(NSLocalizedString("watch.queue.empty", comment: ""))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                } else {
                    List {
                        ForEach(store.recordings) { recording in
                            NavigationLink(value: recording.id) {
                                RecordingRow(recording: recording)
                            }
                        }
                    }
                    .navigationDestination(for: String.self) { recordingId in
                        if let recording = store.recordings.first(where: { $0.id == recordingId }) {
                            RecordingQueueDetailView(recording: recording)
                        }
                    }
                }
            }
            .navigationTitle(NSLocalizedString("watch.queue.title", comment: ""))
            .onAppear {
                sessionManager.reconcileStuckTransfers()
                sessionManager.flushPendingTransfers()
            }
        }
    }
}

struct RecordingRow: View {
    let recording: PendingRecording

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(formatDuration(recording.durationSeconds))
                    .font(.headline)

                Text(formatDate(recording.createdAt))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            statusView
        }
    }

    @ViewBuilder
    private var statusView: some View {
        switch recording.syncState {
        case .pending:
            Image(systemName: "clock")
                .foregroundStyle(.orange)
        case .syncing:
            ProgressView()
        case .synced:
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
        case .failed:
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.red)
        }
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    private func formatDate(_ date: Date) -> String {
        WatchDateFormatting.displayDateTime(date)
    }
}

struct RecordingQueueDetailView: View {
    let recording: PendingRecording

    @EnvironmentObject var sessionManager: WatchSessionManager
    @Environment(\.dismiss) private var dismiss
    @StateObject private var store = PendingRecordingStore.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(formatDuration(recording.durationSeconds))
                        .font(.title2.bold())

                    Text(formatDate(recording.createdAt))
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    statusLabel
                }

                if recording.syncState == .failed || recording.syncState == .syncing {
                    Button {
                        sessionManager.retryFailedTransfer(recording)
                        dismiss()
                    } label: {
                        Label(
                            NSLocalizedString("watch.queue.retry", comment: ""),
                            systemImage: "arrow.clockwise"
                        )
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.blue)
                }

                Button(role: .destructive) {
                    store.remove(recording)
                    dismiss()
                } label: {
                    Label(
                        NSLocalizedString("watch.queue.delete", comment: ""),
                        systemImage: "trash"
                    )
                }
                .buttonStyle(.bordered)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 4)
        }
        .navigationTitle(NSLocalizedString("watch.queue.detail_title", comment: ""))
    }

    @ViewBuilder
    private var statusLabel: some View {
        switch recording.syncState {
        case .pending:
            Label(NSLocalizedString("watch.sync.pending", comment: ""), systemImage: "clock")
                .font(.caption)
                .foregroundStyle(.orange)
        case .syncing:
            Label(NSLocalizedString("watch.sync.syncing", comment: ""), systemImage: "arrow.triangle.2.circlepath")
                .font(.caption)
                .foregroundStyle(.secondary)
        case .synced:
            Label(NSLocalizedString("watch.sync.synced", comment: ""), systemImage: "checkmark.circle.fill")
                .font(.caption)
                .foregroundStyle(.green)
        case .failed:
            Label(NSLocalizedString("watch.sync.failed", comment: ""), systemImage: "exclamationmark.triangle.fill")
                .font(.caption)
                .foregroundStyle(.red)
        }
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    private func formatDate(_ date: Date) -> String {
        WatchDateFormatting.displayDateTime(date)
    }
}
