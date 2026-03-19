import ActivityKit
import WidgetKit
import SwiftUI

private enum DownloadDeeplink {
    static let settingsUrl = URL(string: "voiceinbox://settings/whisper")!
}

struct DownloadLiveActivityView: View {
    let context: ActivityViewContext<DownloadAttributes>
    @State private var rotating = false
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

    var body: some View {
        Link(destination: DownloadDeeplink.settingsUrl) {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .stroke(Color.blue.opacity(0.15), lineWidth: 3)
                        .frame(width: 32, height: 32)

                    Circle()
                        .trim(from: 0, to: 0.7)
                        .stroke(Color.blue, style: StrokeStyle(lineWidth: 3,
                                                               lineCap: .round))
                        .frame(width: 32, height: 32)
                        .rotationEffect(.degrees(rotating ? 360 : 0))
                        .onAppear {
                            withAnimation(.linear(duration: 1.2)
                                .repeatForever(autoreverses: false)) {
                                rotating = true
                            }
                        }

                    Image(systemName: "arrow.down")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.blue)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(context.state.label)
                        .font(.headline)
                        .foregroundColor(.primary)
                        .lineLimit(1)

                    Text(context.state.title)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.primary)
                    .padding(8)
                    .background(colorScheme == .light
                        ? Color.black.opacity(0.06)
                        : Color.white.opacity(0.15))
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(lockScreenBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16,
                                    style: .continuous))
        .activityBackgroundTint(activityBackgroundTint)
    }

    private var activityBackgroundTint: Color {
        colorScheme == .light
            ? Color.white.opacity(0.92)
            : Color.black.opacity(0.45)
    }
}


struct DownloadWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DownloadAttributes.self) { context in
            DownloadLiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Link(destination: DownloadDeeplink.settingsUrl) {
                        SpinnerView()
                            .frame(width: 32, height: 32)
                            .frame(maxHeight: .infinity, alignment: .center)
                    }
                }
                DynamicIslandExpandedRegion(.center) {
                    Link(destination: DownloadDeeplink.settingsUrl) {
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
                Link(destination: DownloadDeeplink.settingsUrl) {
                    Image(systemName: "arrow.down.circle.fill")
                        .foregroundColor(.blue)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            } compactTrailing: {
                Link(destination: DownloadDeeplink.settingsUrl) {
                    Text("Whisper")
                        .font(.caption2)
                        .foregroundColor(.blue)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            } minimal: {
                Link(destination: DownloadDeeplink.settingsUrl) {
                    Image(systemName: "arrow.down.circle.fill")
                        .foregroundColor(.blue)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
    }
}

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
