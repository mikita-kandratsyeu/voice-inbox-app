import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

struct RecordingLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RecordingActivityAttributes.self) { context in
            LockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "mic.fill")
                        .foregroundColor(.red)
                        .font(.title2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if !context.state.isStopped {
                        Button(intent: StopRecordingIntent()) {
                            Image(systemName: "stop.fill")
                                .foregroundColor(.white)
                                .padding(6)
                                .background(Color.red)
                                .clipShape(Circle())
                        }
                        .buttonStyle(.plain)
                    }
                }
                DynamicIslandExpandedRegion(.center) {
                    if context.state.isStopped {
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text("Recording saved")
                                .font(.subheadline)
                                .foregroundColor(.primary)
                        }
                    } else {
                        Text(timerText(seconds: context.state.elapsedSeconds))
                            .font(.title3.monospacedDigit())
                            .foregroundColor(.primary)
                    }
                }
            } compactLeading: {
                Image(systemName: context.state.isStopped ? "checkmark.circle.fill" : "mic.fill")
                    .foregroundColor(context.state.isStopped ? .green : .red)
            } compactTrailing: {
                if context.state.isStopped {
                    EmptyView()
                } else {
                    Text(timerText(seconds: context.state.elapsedSeconds))
                        .font(.caption.monospacedDigit())
                        .foregroundColor(.primary)
                }
            } minimal: {
                Image(systemName: context.state.isStopped ? "checkmark.circle.fill" : "mic.fill")
                    .foregroundColor(context.state.isStopped ? .green : .red)
            }
        }
    }

    private func timerText(seconds: Int) -> String {
        let h = seconds / 3600
        let m = (seconds % 3600) / 60
        let s = seconds % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%02d:%02d", m, s)
    }
}

private struct LockScreenView: View {
    let context: ActivityViewContext<RecordingActivityAttributes>

    var body: some View {
        if context.state.isStopped {
            SavedView()
        } else {
            RecordingView(elapsedSeconds: context.state.elapsedSeconds)
        }
    }
}

private struct RecordingView: View {
    let elapsedSeconds: Int

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: "mic.fill")
                .font(.title)
                .foregroundColor(.red)

            VStack(alignment: .leading, spacing: 2) {
                Text("Recording")
                    .font(.headline)
                    .foregroundColor(.primary)
                Text(timerText(seconds: elapsedSeconds))
                    .font(.subheadline.monospacedDigit())
                    .foregroundColor(.secondary)
            }

            Spacer()

            Button(intent: StopRecordingIntent()) {
                Label("Stop", systemImage: "stop.fill")
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.red)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding()
        .activityBackgroundTint(Color(UIColor.systemBackground))
    }

    private func timerText(seconds: Int) -> String {
        let h = seconds / 3600
        let m = (seconds % 3600) / 60
        let s = seconds % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%02d:%02d", m, s)
    }
}

private struct SavedView: View {
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.title)
                .foregroundColor(.green)

            Text("Recording saved")
                .font(.headline)
                .foregroundColor(.primary)

            Spacer()
        }
        .padding()
        .activityBackgroundTint(Color(UIColor.systemBackground))
    }
}
