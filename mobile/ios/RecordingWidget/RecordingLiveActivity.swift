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
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.red)
                        .frame(maxHeight: .infinity)
                        .padding(.leading, 6)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    EmptyView()
                }
                DynamicIslandExpandedRegion(.center) {
                    if context.state.isStopped {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                            Text(NSLocalizedString("recording.saved", comment: ""))
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(.white)
                        }
                        .frame(maxHeight: .infinity)
                    } else {
                        VStack(spacing: 2) {
                            Text(NSLocalizedString("recording.title", comment: ""))
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(.white)
                            Text("Voice Inbox AI")
                                .font(.system(size: 10))
                                .foregroundStyle(.white.opacity(0.4))
                        }
                        .frame(maxHeight: .infinity)
                    }
                }
            } compactLeading: {
                Image(systemName: context.state.isStopped ? "checkmark.circle.fill" : "mic.fill")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(context.state.isStopped ? .green : .red)
            } compactTrailing: {
                if context.state.isStopped {
                    Text(NSLocalizedString("recording.saved.short", comment: ""))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.green)
                } else {
                    HStack(spacing: 3) {
                        PulsingDot()
                        Text(NSLocalizedString("recording.indicator", comment: ""))
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.red)
                    }
                }
            } minimal: {
                Image(systemName: context.state.isStopped ? "checkmark.circle.fill" : "mic.fill")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(context.state.isStopped ? .green : .red)
            }
        }
    }
}

// MARK: - Lock Screen

private struct LockScreenView: View {
    let context: ActivityViewContext<RecordingActivityAttributes>

    var body: some View {
        Group {
            if context.state.isStopped {
                SavedView()
            } else {
                RecordingView()
            }
        }
    }
}

private struct RecordingView: View {
    var body: some View {
        HStack(spacing: 0) {
            // Left — icon
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.red.opacity(0.12))
                    .frame(width: 52, height: 52)
                Image(systemName: "mic.fill")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.red)
                    .symbolEffect(.pulse)
            }

            // Center — text
            VStack(alignment: .leading, spacing: 3) {
                Text("Voice Inbox AI")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                    .kerning(0.4)
                Text(NSLocalizedString("recording.title", comment: ""))
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.primary)
            }
            .padding(.leading, 14)

            Spacer()

            // Right — duration indicator
            VStack(spacing: 3) {
                PulsingDot(color: .red, size: 9)
                Text(NSLocalizedString("recording.indicator", comment: ""))
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .activityBackgroundTint(Color(UIColor.systemBackground))
    }
}

private struct SavedView: View {
    var body: some View {
        HStack(spacing: 0) {
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.green.opacity(0.12))
                    .frame(width: 52, height: 52)
                Image(systemName: "checkmark")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.green)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text("Voice Inbox AI")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                    .kerning(0.4)
                Text(NSLocalizedString("recording.saved", comment: ""))
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.primary)
            }
            .padding(.leading, 14)

            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 28))
                .foregroundStyle(.green.opacity(0.8))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .activityBackgroundTint(Color(UIColor.systemBackground))
    }
}

// MARK: - Pulsing dot

private struct PulsingDot: View {
    var color: Color = .red
    var size: CGFloat = 7

    @State private var pulsing = false

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: size, height: size)
            .scaleEffect(pulsing ? 1.35 : 1.0)
            .opacity(pulsing ? 0.5 : 1.0)
            .animation(
                .easeInOut(duration: 0.9).repeatForever(autoreverses: true),
                value: pulsing
            )
            .onAppear { pulsing = true }
    }
}
