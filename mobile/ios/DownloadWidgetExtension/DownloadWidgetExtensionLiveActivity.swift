import ActivityKit
import WidgetKit
import SwiftUI

private enum DownloadDeeplink {
    static let settingsUrl = URL(string: "voiceinbox://settings/whisper")!
}

struct DownloadLiveActivityView: View {
    let context: ActivityViewContext<DownloadAttributes>
    @State private var rotating = false

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .stroke(Color.blue.opacity(0.15), lineWidth: 3)
                    .frame(width: 40, height: 40)

                Circle()
                    .trim(from: 0, to: 0.7)
                    .stroke(Color.blue, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .frame(width: 40, height: 40)
                    .rotationEffect(.degrees(rotating ? 360 : 0))
                    .onAppear {
                        withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                            rotating = true
                        }
                    }

                Image(systemName: "arrow.down")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.blue)
            }

            VStack(alignment: .leading, spacing: 3) {
              Text(context.state.label)
                    .font(.headline)
                    .lineLimit(1)

                Text(context.state.title)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            Link(destination: DownloadDeeplink.settingsUrl) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.secondary)
                    .padding(8)
                    .background(Color.secondary.opacity(0.12))
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
    }
}

struct DownloadWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DownloadAttributes.self) { context in
            DownloadLiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    SpinnerView()
                        .frame(width: 32, height: 32)
                        .frame(maxHeight: .infinity, alignment: .center)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .center, spacing: 3) {
                      Text(context.state.label)
                            .font(.headline)
                            .lineLimit(1)

                        Text(context.state.title)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Link(destination: DownloadDeeplink.settingsUrl) {
                        Image(systemName: "arrow.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(10)
                        .background(Color.blue)
                        .clipShape(Circle())
                    }
                    .frame(maxHeight: .infinity, alignment: .center)
                }
            } compactLeading: {
                Image(systemName: "arrow.down.circle.fill")
                    .foregroundColor(.blue)
            } compactTrailing: {
                Text("Whisper")
                    .font(.caption2)
                    .foregroundColor(.blue)
            } minimal: {
                Image(systemName: "arrow.down.circle.fill")
                    .foregroundColor(.blue)
            }
        }
    }
}

// Отдельный view для спиннера чтобы @State работал в DynamicIsland
struct SpinnerView: View {
    @State private var rotating = false

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.blue.opacity(0.15), lineWidth: 2.5)

            Circle()
                .trim(from: 0, to: 0.7)
                .stroke(Color.blue, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                .rotationEffect(.degrees(rotating ? 360 : 0))
                .onAppear {
                    withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                        rotating = true
                    }
                }

            Image(systemName: "arrow.down")
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.blue)
        }
    }
}

#Preview("Lock Screen", as: .content, using: DownloadAttributes(id: "whisper-base")) {
    DownloadWidgetLiveActivity()
} contentStates: {
    DownloadAttributes.ContentState(
        modelId: "whisper-base",
        progress: 0.0,
        title: "Whisper Base (74 MB)",
        label: "Downloading Whisper"
    )
    DownloadAttributes.ContentState(
        modelId: "whisper-base",
        progress: 0.45,
        title: "Whisper Base (74 MB)",
        label: "Downloading Whisper"
    )
}

#Preview("DI Expanded", as: .dynamicIsland(.expanded), using: DownloadAttributes(id: "whisper-base")) {
    DownloadWidgetLiveActivity()
} contentStates: {
    DownloadAttributes.ContentState(
        modelId: "whisper-base",
        progress: 0.45,
        title: "Whisper Base (74 MB)",
        label: "Downloading Whisper"
    )
}

#Preview("DI Compact", as: .dynamicIsland(.compact), using: DownloadAttributes(id: "whisper-base")) {
    DownloadWidgetLiveActivity()
} contentStates: {
    DownloadAttributes.ContentState(
        modelId: "whisper-base",
        progress: 0.45,
        title: "Whisper Base (74 MB)",
        label: "Downloading Whisper"
    )
}

#Preview("DI Minimal", as: .dynamicIsland(.minimal), using: DownloadAttributes(id: "whisper-base")) {
    DownloadWidgetLiveActivity()
} contentStates: {
    DownloadAttributes.ContentState(
        modelId: "whisper-base",
        progress: 0.45,
        title: "Whisper Base (74 MB)",
        label: "Downloading Whisper"
    )
}
