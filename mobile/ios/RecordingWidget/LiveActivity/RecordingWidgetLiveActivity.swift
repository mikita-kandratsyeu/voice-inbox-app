import ActivityKit
import WidgetKit
import SwiftUI

private func formatTime(_ seconds: Int) -> String {
    let clamped = max(0, seconds)
    let h = clamped / 3600
    let m = (clamped % 3600) / 60
    let s = clamped % 60

    if h > 0 {
        return String(format: "%d:%02d:%02d", h, m, s)
    }

    return String(format: "%02d:%02d", m, s)
}

/// Live Activity timer driven by `startDate` so it keeps ticking without per-second RN updates.
private struct RecordingLiveActivityTimerText: View {
    let state: RecordingAttributes.ContentState
    let font: Font
    let foreground: Color
    var minimumScaleFactor: CGFloat = 0.8
    var offsetY: CGFloat = 0

    var body: some View {
        Group {
            if state.isRecording {
                Text(timerInterval: state.startDate...Date.distantFuture, countsDown: false)
            } else {
                Text(formatTime(state.elapsedSeconds))
            }
        }
        .font(font)
        .monospacedDigit()
        .minimumScaleFactor(minimumScaleFactor)
        .foregroundStyle(foreground)
        .lineLimit(1)
        .offset(y: offsetY)
        .transaction { transaction in
            transaction.animation = nil
        }
    }
}

private enum RecordingDeeplink {
    static let stopRecordingString = "voiceinbox://stop-recording"
    static let stopRecordingURL = URL(string: stopRecordingString)!
}

private extension RecordingLiveActivityView {
    var containerBackground: some ShapeStyle {
        colorScheme == .light
            ? Color.white.opacity(0.96)
            : Color.black.opacity(0.82)
    }

    var containerBorder: Color {
      .clear
    }

    var leftIconBackground: Color {
        colorScheme == .light
            ? Color.accentColor.opacity(0.12)
            : Color.accentColor.opacity(0.18)
    }

    var leftIconForeground: Color {
        colorScheme == .light
            ? Color.accentColor
            : Color.accentColor.opacity(0.95)
    }

    var trailingButtonFill: Color {
        colorScheme == .light
            ? Color.black.opacity(0.06)
            : Color.white.opacity(0.18)
    }

    var trailingButtonForeground: Color {
        colorScheme == .light
            ? Color.primary.opacity(0.9)
            : Color.white.opacity(0.95)
    }

    var timerForeground: Color {
        colorScheme == .light
            ? Color.primary.opacity(0.92)
            : Color.white.opacity(0.96)
    }

    var timerShadowColor: Color {
        colorScheme == .light
            ? Color.black.opacity(0.04)
            : Color.black.opacity(0.22)
    }

    var activityBackgroundTint: Color {
      .clear
    }

    var systemActionForeground: Color {
        colorScheme == .light ? .black : .white
    }
}

struct RecordingLiveActivityView: View {
    let context: ActivityViewContext<RecordingAttributes>
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        HStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(leftIconBackground)
                    .frame(width: 64, height: 64)

              Image(systemName: context.state.isRecording ? "waveform" : "pause.fill")
                  .font(.system(size: 20, weight: .semibold))
                  .foregroundStyle(leftIconForeground)

            }
            .frame(width: 72)

            Spacer()

            RecordingLiveActivityTimerText(
                state: context.state,
                font: .system(size: 34, weight: .semibold, design: .rounded),
                foreground: timerForeground
            )
            .dynamicTypeSize(.medium)
            .frame(maxWidth: .infinity, alignment: .center)

            Spacer()

            Link(destination: RecordingDeeplink.stopRecordingURL) {
                ZStack {
                    Circle()
                        .fill(trailingButtonFill)
                        .background(.regularMaterial, in: Circle())
                        .frame(width: 64, height: 64)

                    Image(systemName: context.state.isRecording ? "pause.fill" : "play.fill")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(trailingButtonForeground)
                }
            }
            .frame(width: 72)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 16)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 30)
                .fill(containerBackground)
                .padding(.horizontal, -6)
        )
        .activityBackgroundTint(activityBackgroundTint)
        .activitySystemActionForegroundColor(systemActionForeground)
    }
}

struct RecordingWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RecordingAttributes.self) { context in
            RecordingLiveActivityView(context: context)
          } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    ZStack {
                        Circle()
                            .fill(Color.accentColor.opacity(0.16))
                            .frame(width: 50, height: 50)

                        Image(systemName: context.state.isRecording ? "waveform" : "pause.fill")
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundStyle(Color.accentColor)
                    }
                    .frame(width: 56, height: 56, alignment: .center)
                }

                DynamicIslandExpandedRegion(.center) {
                    VStack {
                        Spacer(minLength: 0)

                        RecordingLiveActivityTimerText(
                            state: context.state,
                            font: .system(size: 32, weight: .medium, design: .rounded),
                            foreground: .primary,
                            minimumScaleFactor: 0.85,
                            offsetY: -8
                        )

                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    Link(destination: RecordingDeeplink.stopRecordingURL) {
                        ZStack {
                            Circle()
                                .fill(Color.primary.opacity(0.10))
                                .background(.ultraThinMaterial, in: Circle())
                                .frame(width: 46, height: 46)

                            Image(systemName: context.state.isRecording ? "pause.fill" : "play.fill")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundStyle(.primary)
                        }
                    }
                    .buttonStyle(.plain)
                    .frame(width: 52, height: 52, alignment: .center)
                }
            } compactLeading: {
                ZStack {
                    Circle()
                        .fill(Color.accentColor.opacity(0.16))
                        .frame(width: 22, height: 22)

                    Image(systemName: context.state.isRecording ? "waveform" : "pause.fill")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Color.accentColor)
                }
            } compactTrailing: {
                RecordingLiveActivityTimerText(
                    state: context.state,
                    font: .system(size: 12, weight: .semibold, design: .rounded),
                    foreground: .primary,
                    minimumScaleFactor: 0.75
                )
            } minimal: {
                ZStack {
                    Circle()
                        .fill(Color.accentColor.opacity(0.16))
                        .frame(width: 20, height: 20)

                    Image(systemName: context.state.isRecording ? "waveform" : "pause.fill")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(Color.accentColor)
                }
            }
        }
    }
}

//private extension RecordingAttributes.ContentState {
//    static var recordingPreview: Self {
//        .init(
//            isRecording: true,
//            startDate: Date().addingTimeInterval(-70),
//            elapsedSeconds: 70,
//            title: "Recording"
//        )
//    }
//
//    static var pausedPreview: Self {
//        .init(
//            isRecording: false,
//            startDate: Date().addingTimeInterval(-70),
//            elapsedSeconds: 70,
//            title: "Paused"
//        )
//    }
//}

//@available(iOS 17.2, *)
//#Preview("Live Activity – Recording", as: .content, using: RecordingAttributes(sessionId: "preview-recording")) {
//    RecordingWidgetLiveActivity()
//} contentStates: {
//    RecordingAttributes.ContentState.recordingPreview
//}
//
//@available(iOS 17.2, *)
//#Preview("Live Activity – Paused", as: .content, using: RecordingAttributes(sessionId: "preview-paused")) {
//    RecordingWidgetLiveActivity()
//} contentStates: {
//    RecordingAttributes.ContentState.pausedPreview
//}

//@available(iOS 17.2, *)
//#Preview("Dynamic Island Expanded", as: .dynamicIsland(.expanded), using: RecordingAttributes(sessionId: "preview-island-expanded")) {
//    RecordingWidgetLiveActivity()
//} contentStates: {
//    RecordingAttributes.ContentState.recordingPreview
//}

//@available(iOS 17.2, *)
//#Preview("Dynamic Island Compact", as: .dynamicIsland(.compact), using: RecordingAttributes(sessionId: "preview-island-compact")) {
//    RecordingWidgetLiveActivity()
//} contentStates: {
//    RecordingAttributes.ContentState.recordingPreview
//}
//
//@available(iOS 17.2, *)
//#Preview("Dynamic Island Minimal", as: .dynamicIsland(.minimal), using: RecordingAttributes(sessionId: "preview-island-minimal")) {
//    RecordingWidgetLiveActivity()
//} contentStates: {
//    RecordingAttributes.ContentState.recordingPreview
//}