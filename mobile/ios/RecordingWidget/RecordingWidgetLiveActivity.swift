import ActivityKit
import WidgetKit
import SwiftUI

private func formattedLiveActivityTime(from state: RecordingAttributes.ContentState) -> String {
    if !state.isRecording {
        return formatTime(state.elapsedSeconds)
    }

    let base = state.elapsedSeconds
    let start = state.startDate

    let baseDate = start.addingTimeInterval(TimeInterval(base))
    let extra = max(0, Date().timeIntervalSince(baseDate))
    let totalSeconds = base + Int(extra.rounded())
  
    return formatTime(totalSeconds)
}


private func formatTime(_ seconds: Int) -> String {
    let m = seconds / 60
    let s = seconds % 60
  
    return String(format: "%02d:%02d", m, s)
}

private enum RecordingDeeplink {
    static let stopRecordingString = "voiceinbox://stop-recording"
    static let stopRecordingURL = URL(string: stopRecordingString)!
}

struct PulsingRecordIcon: View {
    let baseSize: CGFloat
    let pulseScale: CGFloat

    @State private var animate = false

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.red.opacity(0.3))
                .frame(width: baseSize * pulseScale,
                       height: baseSize * pulseScale)
                .scaleEffect(animate ? 1.0 : 0.5)
                .opacity(animate ? 0.0 : 1.0)

            Circle()
                .fill(Color.red)
                .frame(width: baseSize, height: baseSize)
        }
        .onAppear {
            withAnimation(
                .easeOut(duration: 1.0)
                    .repeatForever(autoreverses: false)
            ) {
                animate = true
            }
        }
    }
}

struct RecordingLiveActivityView: View {
    let context: ActivityViewContext<RecordingAttributes>
    @Environment(\.colorScheme) private var colorScheme

    private var lockScreenBackground: some View {
        Group {
            if colorScheme == .light {
                Color(.systemBackground).opacity(0.95)
            } else {
                Color(.secondarySystemBackground).opacity(0.95)
            }
        }
    }

    private var activityBackgroundTint: Color {
        colorScheme == .light
            ? Color.white.opacity(0.92)
            : Color.black.opacity(0.45)
    }

    var body: some View {
        HStack {
            if context.state.isRecording {
              PulsingRecordIcon(baseSize: 12, pulseScale: 1.8)
            } else {
                Image(systemName: "pause.circle")
                    .foregroundColor(.red)
                    .font(.title2)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(context.state.title)
                    .font(.headline)
                    .foregroundColor(.primary)
                if context.state.isRecording {
                    Text(
                        timerInterval: context.state.startDate...Date(),
                        countsDown: false
                    )
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .monospacedDigit()
                } else {
                    Text(formatTime(context.state.elapsedSeconds))
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .monospacedDigit()
                }
            }
            Spacer()
          
            Link(destination: RecordingDeeplink.stopRecordingURL) {
                     Image(systemName: "stop.fill")
                         .font(.title3)
                         .foregroundColor(.white)
                         .padding(10)
                         .background(Color.red)
                         .clipShape(Circle())
                 }
        }
        .padding()
        .background(lockScreenBackground)
        .activityBackgroundTint(activityBackgroundTint)
    }
}

struct RecordingWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RecordingAttributes.self) { context in
            RecordingLiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // First region
                DynamicIslandExpandedRegion(.leading) {
                    if context.state.isRecording {
                        PulsingRecordIcon(baseSize: 12, pulseScale: 1.8)
                        .frame(maxHeight: .infinity, alignment: .center)
                    } else {
                        Image(systemName: "pause.circle")
                            .foregroundColor(.red)
                            .frame(maxHeight: .infinity, alignment: .center)
                    }
                }
                // Second region
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .center, spacing: 4) {
                        Text(context.state.title)
                            .font(.headline)
                            .lineLimit(1)
                            .multilineTextAlignment(.center)
                        Text(formattedLiveActivityTime(from: context.state))
                            .font(.caption)
                            .monospacedDigit()
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                }
                // Third region
                DynamicIslandExpandedRegion(.trailing) {
                      Link(destination: RecordingDeeplink.stopRecordingURL) {
                          Image(systemName: "stop.fill")
                              .font(.title3)
                              .foregroundColor(.white)
                              .padding(12)
                              .background(Color.red)
                              .clipShape(Circle())
                      }
                      .frame(maxHeight: .infinity, alignment: .center)
                }
            } compactLeading: {
                if context.state.isRecording {
                    PulsingRecordIcon(baseSize: 8, pulseScale: 1.6)
                } else {
                    Image(systemName: "pause.circle")
                        .foregroundColor(.red)
                }
            } compactTrailing: {
                Text(formattedLiveActivityTime(from: context.state))
                    .font(.caption2)
                    .monospacedDigit()
            } minimal: {
                if context.state.isRecording {
                    PulsingRecordIcon(baseSize: 7, pulseScale: 1.5)
                } else {
                    Image(systemName: "pause.circle")
                }
            }
        }
    }
}
