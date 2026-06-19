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
                            .font(.system(size: 44))
                            .foregroundStyle(.orange.opacity(0.6))
                            .symbolEffect(.bounce)
                        Text(NSLocalizedString("watch.queue.empty", comment: ""))
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 8)
                    }
                    .padding(.vertical, 20)
                } else {
                    List {
                        ForEach(store.recordings) { recording in
                            NavigationLink(value: recording.id) {
                                RecordingRow(recording: recording)
                            }
                            .navigationLinkIndicatorVisibility(.hidden)
                            .listRowInsets(EdgeInsets(top: 6, leading: 2, bottom: 6, trailing: 2))
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    store.remove(recording)
                                } label: {
                                    Label(NSLocalizedString("watch.queue.delete", comment: ""), systemImage: "trash")
                                }
                            }
                            .swipeActions(edge: .leading, allowsFullSwipe: false) {
                                if recording.syncState == .failed || recording.syncState == .syncing {
                                    Button {
                                        sessionManager.retryFailedTransfer(recording)
                                    } label: {
                                        Label(NSLocalizedString("watch.queue.retry", comment: ""), systemImage: "arrow.clockwise")
                                    }
                                    .tint(.blue)
                                }
                            }
                        }
                    }
                    .listStyle(.carousel)
                    .navigationDestination(for: String.self) { recordingId in
                        if let recording = store.recordings.first(where: { $0.id == recordingId }) {
                            RecordingQueueDetailView(recording: recording)
                        }
                    }
                }
            }
            .navigationTitle(NSLocalizedString("watch.queue.title", comment: ""))
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Label(NSLocalizedString("watch.queue.title", comment: ""), systemImage: "clock.fill")
                        .labelStyle(.iconOnly)
                        .foregroundStyle(.white.opacity(0.8))
                        .font(.system(size: 20))
                }
            }
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
        HStack(alignment: .center, spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                Text(formatDuration(recording.durationSeconds))
                    .font(.system(size: 16, weight: .semibold))

                Text(formatDate(recording.createdAt))
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 6)

            statusView
        }
        .padding(.vertical, 6)
        .padding(.trailing, 2)
    }

    @ViewBuilder
    private var statusView: some View {
        switch recording.syncState {
        case .pending:
            Image(systemName: "clock")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(.orange)
                .frame(width: 24, height: 24)
                .symbolEffect(.pulse, options: .repeating)
        case .syncing:
            ProgressView()
                .controlSize(.regular)
                .frame(width: 24, height: 24)
        case .synced:
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(.green)
                .frame(width: 24, height: 24)
                .symbolEffect(.bounce, value: recording.syncState)
        case .failed:
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(.red)
                .frame(width: 24, height: 24)
                .symbolEffect(.bounce, value: recording.syncState)
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
