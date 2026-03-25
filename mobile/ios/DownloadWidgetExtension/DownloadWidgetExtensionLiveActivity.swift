import ActivityKit
import WidgetKit
import SwiftUI

private enum DownloadDeeplink {
    static let settingsUrl = URL(string: "voiceinbox://settings/whisper")!
}

struct DownloadLiveActivityView: View {
    let context: ActivityViewContext<DownloadAttributes>
    @Environment(\.colorScheme) private var colorScheme

    private var clampedProgress: Double {
        min(max(context.state.progress, 0), 1)
    }

    private var progressPercentText: String {
        "\(Int((clampedProgress * 100).rounded()))%"
    }

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
                Image(systemName: "tray.and.arrow.down.fill")
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundColor(.blue)

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

                Text(progressPercentText)
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundColor(.blue)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(colorScheme == .light
                        ? Color.black.opacity(0.06)
                        : Color.white.opacity(0.15))
                    .clipShape(Capsule())
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
                        Image(systemName: "tray.and.arrow.down.fill")
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundColor(.blue)
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
                        Text("\(Int((min(max(context.state.progress, 0), 1) * 100).rounded()))%")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                            .lineLimit(1)
                            .minimumScaleFactor(0.9)
                            .foregroundColor(.white)
                            .frame(minWidth: 36)
                            .padding(10)
                            .background(Color.blue)
                            .clipShape(Capsule())
                    }
                    .frame(maxHeight: .infinity, alignment: .center)
                }
            } compactLeading: {
                Link(destination: DownloadDeeplink.settingsUrl) {
                    Image(systemName: "tray.and.arrow.down.fill")
                        .foregroundColor(.blue)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            } compactTrailing: {
                Link(destination: DownloadDeeplink.settingsUrl) {
                    Text("\(Int((min(max(context.state.progress, 0), 1) * 100).rounded()))%")
                        .font(.caption2)
                        .monospacedDigit()
                        .lineLimit(1)
                        .foregroundColor(.blue)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            } minimal: {
                Link(destination: DownloadDeeplink.settingsUrl) {
                    Image(systemName: "tray.and.arrow.down.fill")
                        .foregroundColor(.blue)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
    }
}
