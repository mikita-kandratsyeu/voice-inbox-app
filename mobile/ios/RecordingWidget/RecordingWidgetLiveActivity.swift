import ActivityKit
import WidgetKit
import SwiftUI

private func formattedLiveActivityTime(from state: RecordingAttributes.ContentState) -> String {
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

    var body: some View {
        HStack {
            if context.state.isRecording {
              PulsingRecordIcon(baseSize: 12, pulseScale: 1.8)
            } else {
                Image(systemName: "stop.circle")
                    .foregroundColor(.red)
                    .font(.title2)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(context.state.title)
                    .font(.headline)
                Text(formattedLiveActivityTime(from: context.state))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            Spacer()
          
            Link(destination: URL(string: "voiceinbox://stop-recording")!) {
                     Image(systemName: "stop.fill")
                         .font(.title3)
                         .foregroundColor(.white)
                         .padding(10)
                         .background(Color.red)
                         .clipShape(Circle())
                 }
        }
        .padding()
        .background(.ultraThinMaterial)
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
                        Image(systemName: "mic.slash.fill")
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
                      Link(destination: URL(string: "voiceinbox://stop-recording")!) {
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
                    Image(systemName: "mic.fill")
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
                    Image(systemName: "mic.fill")
                }
            }
        }
    }
}

#Preview("Lock Screen", as: .content, using: RecordingAttributes(sessionId: "preview")) {
    RecordingWidgetLiveActivity()
} contentStates: {
    RecordingAttributes.ContentState(
        isRecording: true,
        startDate: Date(),
        elapsedSeconds: 125,
        title: "Демо запись"
    )
}

//#Preview("DI Expanded", as: .dynamicIsland(.expanded),
//         using: RecordingAttributes(sessionId: "preview")) {
//    RecordingWidgetLiveActivity()
//} contentStates: {
//    RecordingAttributes.ContentState(
//        isRecording: true,
//        elapsedSeconds: 125,
//        title: "Демо запись"
//    )
//}
//
//#Preview("DI Compact Leading/Trailing", as: .dynamicIsland(.compact),
//         using: RecordingAttributes(sessionId: "preview")) {
//    RecordingWidgetLiveActivity()
//} contentStates: {
//    RecordingAttributes.ContentState(
//        isRecording: true,
//        elapsedSeconds: 125,
//        title: "Демо запись"
//    )
//}
//
//#Preview("DI Minimal", as: .dynamicIsland(.minimal),
//         using: RecordingAttributes(sessionId: "preview")) {
//    RecordingWidgetLiveActivity()
//} contentStates: {
//    RecordingAttributes.ContentState(
//        isRecording: true,
//        elapsedSeconds: 125,
//        title: "Демо запись"
//    )
//}
//
