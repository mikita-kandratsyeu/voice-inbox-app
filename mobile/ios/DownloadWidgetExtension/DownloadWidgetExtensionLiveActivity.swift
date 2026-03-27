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

    var body: some View {
        Link(destination: DownloadDeeplink.settingsUrl) {
            HStack {
                leftIcon

                Spacer(minLength: 10)

                centerContent

                Spacer(minLength: 10)

                trailingProgress
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(containerBackground)
            )
            .padding(.horizontal, 8)
        }
        .activityBackgroundTint(activityBackgroundTint)
        .activitySystemActionForegroundColor(systemActionForeground)
    }
}

private extension DownloadLiveActivityView {
    var leftIcon: some View {
        ZStack {
            Circle()
                .fill(leftIconBackground)
                .frame(width: 64, height: 64)

            Image(systemName: "arrow.down.circle.fill")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(leftIconForeground)
        }
        .frame(width: 60)
    }

    var centerContent: some View {
        VStack(spacing: 0) {
            Text(context.state.label)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(primaryTextColor)
                .lineLimit(1)

            Text(context.state.title)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(secondaryTextColor)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }

    var trailingProgress: some View {
        ZStack {
            Circle()
                .fill(trailingButtonFill)
                .background(.ultraThinMaterial, in: Circle())
                .frame(width: 64, height: 64)

            Text(progressPercentText)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(trailingButtonForeground)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(width: 60)
    }
}

private extension DownloadLiveActivityView {
    var containerBackground: Color {
        colorScheme == .light
            ? Color.white.opacity(0.96)
            : Color.black.opacity(0.82)
    }

    var containerBorder: Color {
        colorScheme == .light
            ? Color.black.opacity(0.08)
            : Color.white.opacity(0.08)
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
            ? Color.black.opacity(0.07)
            : Color.white.opacity(0.10)
    }

    var trailingButtonForeground: Color {
        colorScheme == .light
            ? Color.primary.opacity(0.92)
            : Color.white.opacity(0.96)
    }

    var primaryTextColor: Color {
        colorScheme == .light
            ? Color.primary.opacity(0.92)
            : Color.white.opacity(0.96)
    }

    var secondaryTextColor: Color {
        colorScheme == .light
            ? Color.secondary.opacity(0.95)
            : Color.white.opacity(0.68)
    }

    var activityBackgroundTint: Color {
        .clear
    }

    var systemActionForeground: Color {
        colorScheme == .light ? .black : .white
    }
}

struct DownloadWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DownloadAttributes.self) { context in
            DownloadLiveActivityView(context: context)
          } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    ZStack {
                        Circle()
                            .fill(Color.accentColor.opacity(0.16))
                            .frame(width: 50, height: 50)

                        Image(systemName: "arrow.down.circle.fill")
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundStyle(Color.accentColor)
                    }
                    .frame(width: 56, height: 56, alignment: .center)
                }

                DynamicIslandExpandedRegion(.center) {
                    ZStack {
                        VStack(spacing: 2) {
                            Text(context.state.label)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(.primary)
                                .lineLimit(1)
                                .multilineTextAlignment(.center)

                            Text("\(Int((min(max(context.state.progress, 0), 1) * 100).rounded()))%")
                                .font(.system(size: 20, weight: .semibold, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(.primary)
                                .lineLimit(1)
                                .multilineTextAlignment(.center)
                                .transaction { transaction in
                                    transaction.animation = nil
                                }
                        }
                        .offset(y: -4)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                }
              
                DynamicIslandExpandedRegion(.trailing) {
                    Link(destination: DownloadDeeplink.settingsUrl) {
                        ZStack {
                            Circle()
                                .fill(Color.primary.opacity(0.10))
                                .background(.ultraThinMaterial, in: Circle())
                                .frame(width: 50, height: 50)

                            Image(systemName: "gearshape.fill")
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundStyle(.primary)
                        }
                    }
                    .buttonStyle(.plain)
                    .frame(width: 56, height: 56, alignment: .center)
                }
            } compactLeading: {
                Link(destination: DownloadDeeplink.settingsUrl) {
                    ZStack {
                        Circle()
                            .fill(Color.accentColor.opacity(0.16))
                            .frame(width: 22, height: 22)

                        Image(systemName: "arrow.down.circle.fill")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(Color.accentColor)
                    }
                }
                .buttonStyle(.plain)
            } compactTrailing: {
                Text("\(Int((min(max(context.state.progress, 0), 1) * 100).rounded()))%")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.primary)
                    .transaction { transaction in
                        transaction.animation = nil
                    }
            } minimal: {
                Link(destination: DownloadDeeplink.settingsUrl) {
                    ZStack {
                        Circle()
                            .fill(Color.accentColor.opacity(0.16))
                            .frame(width: 20, height: 20)

                        Image(systemName: "arrow.down.circle.fill")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(Color.accentColor)
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .keylineTint(.clear)
    }
}


//private struct DownloadPreviewWrapper: View {
//    var body: some View {
//        Text("Preview host")
//    }
//}

//@available(iOS 17.2, *)
//#Preview("Download Live Activity", as: .content, using: DownloadAttributes(id: "preview-download")) {
//    DownloadWidgetLiveActivity()
//} contentStates: {
//    DownloadAttributes.ContentState(
//      modelId: "whisper-medium",
//        progress: 0.64,
//      title: "Whisper Medium",
//        label: "Downloading model"
//        
//    )
//}

//@available(iOS 17.2, *)
//#Preview("Download Island Expanded", as: .dynamicIsland(.expanded), using: DownloadAttributes(id: "preview-download-expanded")) {
//    DownloadWidgetLiveActivity()
//} contentStates: {
//    DownloadAttributes.ContentState(
//      modelId: "whisper-medium",
//        progress: 0.64,
//      title: "Whisper Medium",
//        label: "Downloading model",
//        
//        
//    )
//}

//@available(iOS 17.2, *)
//#Preview("Download Island Compact", as: .dynamicIsland(.compact), using: DownloadAttributes(id: "preview-download-compact")) {
//    DownloadWidgetLiveActivity()
//} contentStates: {
//    DownloadAttributes.ContentState(
//        modelId: "whisper-medium",
//        progress: 0.64,
//        title: "Whisper Medium",
//        label: "Downloading model"
//    )
//}
//
//@available(iOS 17.2, *)
//#Preview("Download Island Minimal", as: .dynamicIsland(.minimal), using: DownloadAttributes(id: "preview-download-minimal")) {
//    DownloadWidgetLiveActivity()
//} contentStates: {
//    DownloadAttributes.ContentState(
//        modelId: "whisper-medium",
//        progress: 0.64,
//        title: "Whisper Medium",
//        label: "Downloading model",
//       
//        
//    )
//}
