import ActivityKit
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
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.red)
                        .frame(maxHeight: .infinity)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.isStopped {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(.green)
                            .frame(maxHeight: .infinity)
                            .padding(.trailing, 4)
                    }
                }
                DynamicIslandExpandedRegion(.center) {
                    if context.state.isStopped {
                        Label(NSLocalizedString("recording.saved.short", comment: ""), systemImage: "checkmark.circle.fill")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(.green)
                            .frame(maxHeight: .infinity)
                    } else {
                        VStack(spacing: 1) {
                            Text(NSLocalizedString("recording.title", comment: ""))
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(.white)
                            Text("Voice Inbox AI")
                                .font(.system(size: 11))
                                .foregroundStyle(.white.opacity(0.45))
                        }
                        .frame(maxHeight: .infinity)
                    }
                }
            } compactLeading: {
                Image(systemName: context.state.isStopped ? "checkmark" : "mic.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(context.state.isStopped ? .green : .red)
            } compactTrailing: {
                if context.state.isStopped {
                    Text(NSLocalizedString("recording.saved.short", comment: ""))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.green)
                } else {
                    Text(NSLocalizedString("recording.indicator", comment: ""))
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.red)
                }
            } minimal: {
                Image(systemName: context.state.isStopped ? "checkmark.circle.fill" : "mic.fill")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(context.state.isStopped ? .green : .red)
            }
        }
    }
}

// MARK: - Lock Screen View

private struct LockScreenView: View {
    let context: ActivityViewContext<RecordingActivityAttributes>

    var body: some View {
        if context.state.isStopped {
            SavedView()
        } else {
            RecordingView()
        }
    }
}

private struct RecordingView: View {
    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color.red.opacity(0.12))
                    .frame(width: 52, height: 52)
                Image(systemName: "mic.fill")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.red)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text("Voice Inbox AI")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
                Text(NSLocalizedString("recording.title", comment: ""))
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.primary)
            }

            Spacer()
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
        .activityBackgroundTint(Color(UIColor.systemBackground))
    }
}

private struct SavedView: View {
    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color.green.opacity(0.12))
                    .frame(width: 52, height: 52)
                Image(systemName: "checkmark")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.green)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text("Voice Inbox AI")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
                Text(NSLocalizedString("recording.saved", comment: ""))
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.primary)
            }

            Spacer()
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
        .activityBackgroundTint(Color(UIColor.systemBackground))
    }
}

// MARK: - Pulsing dot animation

private struct PulsingDot: View {
    @State private var pulsing = false

    var body: some View {
        Circle()
            .fill(Color.red)
            .frame(width: 7, height: 7)
            .scaleEffect(pulsing ? 1.4 : 1.0)
            .opacity(pulsing ? 0.5 : 1.0)
            .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: pulsing)
            .onAppear { pulsing = true }
    }
}
