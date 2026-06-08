import SwiftUI
import WidgetKit

private enum WidgetL10n {
  static var title: String { String(localized: "widget.quick_actions.title") }
  static var record: String { String(localized: "widget.quick_actions.record") }
  static var text: String { String(localized: "widget.quick_actions.text") }
  static var tasks: String { String(localized: "widget.quick_actions.tasks") }
  static var displayName: String { String(localized: "widget.quick_actions.display_name") }
  static var description: String { String(localized: "widget.quick_actions.description") }
}

private struct QuickActionsTheme {
  let colorScheme: ColorScheme

  var containerBackground: Color {
    colorScheme == .light ? Color.white.opacity(0.96) : Color.black.opacity(0.82)
  }

  var accentIconBackground: Color {
    colorScheme == .light ? Color.accentColor.opacity(0.12) : Color.accentColor.opacity(0.18)
  }

  var accentIconForeground: Color {
    colorScheme == .light ? Color.accentColor : Color.accentColor.opacity(0.95)
  }

  var secondaryButtonFill: Color {
    colorScheme == .light ? Color.black.opacity(0.06) : Color.white.opacity(0.18)
  }

  var secondaryIconForeground: Color {
    colorScheme == .light ? Color.primary.opacity(0.9) : Color.white.opacity(0.95)
  }

  var titleForeground: Color {
    colorScheme == .light ? Color.primary.opacity(0.92) : Color.white.opacity(0.96)
  }

  var labelForeground: Color {
    colorScheme == .light ? Color.primary.opacity(0.88) : Color.white.opacity(0.92)
  }

  var divider: Color {
    colorScheme == .light ? Color.black.opacity(0.08) : Color.white.opacity(0.12)
  }
}

private struct QuickActionAccentTile: View {
  let theme: QuickActionsTheme
  let symbol: String
  let title: String
  let diameter: CGFloat
  let iconSize: CGFloat

  var body: some View {
    VStack(spacing: 6) {
      ZStack {
        Circle()
          .fill(theme.accentIconBackground)
          .frame(width: diameter, height: diameter)

        Image(systemName: symbol)
          .font(.system(size: iconSize, weight: .semibold))
          .foregroundStyle(theme.accentIconForeground)
      }

      Text(title)
        .font(.caption2.weight(.semibold))
        .foregroundStyle(theme.labelForeground)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
    }
    .frame(maxWidth: .infinity)
  }
}

private struct QuickActionSecondaryTile: View {
  let theme: QuickActionsTheme
  let symbol: String
  let iconSize: CGFloat
  let height: CGFloat

  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(theme.secondaryButtonFill)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))

      Image(systemName: symbol)
        .font(.system(size: iconSize, weight: .semibold))
        .foregroundStyle(theme.secondaryIconForeground)
    }
    .frame(maxWidth: .infinity)
    .frame(height: height)
  }
}

private struct QuickActionsWidgetView: View {
  @Environment(\.colorScheme) private var colorScheme

  let family: WidgetFamily

  private var theme: QuickActionsTheme {
    QuickActionsTheme(colorScheme: colorScheme)
  }

  var body: some View {
    Group {
      switch family {
      case .systemSmall:
        smallLayout
      default:
        mediumLayout
      }
    }
    .containerBackground(for: .widget) {
      ContainerRelativeShape()
        .fill(theme.containerBackground)
    }
  }

  private var smallLayout: some View {
    VStack(spacing: 0) {
      Link(destination: URL(string: "voiceinbox://record/start")!) {
        VStack(spacing: 6) {
          Spacer(minLength: 0)

          ZStack {
            Circle()
              .fill(theme.accentIconBackground)
              .frame(width: 50, height: 50)

            Image(systemName: "mic.fill")
              .font(.system(size: 20, weight: .semibold))
              .foregroundStyle(theme.accentIconForeground)
          }

          Text(WidgetL10n.record)
            .font(.caption.weight(.semibold))
            .foregroundStyle(theme.titleForeground)
            .lineLimit(1)

          Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
      }

      Rectangle()
        .fill(theme.divider)
        .frame(height: 1)
        .padding(.horizontal, 14)

      HStack(spacing: 8) {
        Link(destination: URL(string: "voiceinbox://note/text")!) {
          QuickActionSecondaryTile(theme: theme, symbol: "square.and.pencil", iconSize: 15, height: 36)
        }

        Rectangle()
          .fill(theme.divider)
          .frame(width: 1)

        Link(destination: URL(string: "voiceinbox://tasks")!) {
          QuickActionSecondaryTile(theme: theme, symbol: "checklist", iconSize: 15, height: 36)
        }
      }
      .padding(.horizontal, 14)
      .padding(.top, 8)
      .padding(.bottom, 12)
    }
  }

  private var mediumLayout: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(WidgetL10n.title)
        .font(.caption.weight(.semibold))
        .foregroundStyle(theme.titleForeground)
        .lineLimit(1)
        .padding(.horizontal, 14)
        .padding(.top, 12)
        .padding(.bottom, 8)

      HStack(spacing: 4) {
        Link(destination: URL(string: "voiceinbox://record/start")!) {
          QuickActionAccentTile(
            theme: theme,
            symbol: "mic.fill",
            title: WidgetL10n.record,
            diameter: 46,
            iconSize: 18
          )
        }

        Link(destination: URL(string: "voiceinbox://note/text")!) {
          QuickActionAccentTile(
            theme: theme,
            symbol: "square.and.pencil",
            title: WidgetL10n.text,
            diameter: 46,
            iconSize: 17
          )
        }

        Link(destination: URL(string: "voiceinbox://tasks")!) {
          QuickActionAccentTile(
            theme: theme,
            symbol: "checklist",
            title: WidgetL10n.tasks,
            diameter: 46,
            iconSize: 17
          )
        }
      }
      .padding(.horizontal, 8)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
      .padding(.bottom, 10)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

struct QuickActionsWidget: Widget {
  static let kind = "QuickActionsWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: Self.kind, provider: QuickActionsProvider()) { entry in
      QuickActionsWidgetView(family: entry.family)
    }
    .configurationDisplayName(LocalizedStringResource("widget.quick_actions.display_name"))
    .description(LocalizedStringResource("widget.quick_actions.description"))
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

private struct QuickActionsEntry: TimelineEntry {
  let date: Date
  let family: WidgetFamily
}

private struct QuickActionsProvider: TimelineProvider {
  func placeholder(in context: Context) -> QuickActionsEntry {
    QuickActionsEntry(date: .now, family: context.family)
  }

  func getSnapshot(in context: Context, completion: @escaping (QuickActionsEntry) -> Void) {
    completion(QuickActionsEntry(date: .now, family: context.family))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<QuickActionsEntry>) -> Void) {
    let entry = QuickActionsEntry(date: .now, family: context.family)
    let nextUpdate = Calendar.current.date(byAdding: .hour, value: 6, to: .now) ?? .now.addingTimeInterval(6 * 3600)
    completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
  }
}

//#Preview("Quick Actions – Small", as: .systemSmall) {
//  QuickActionsWidget()
//} timeline: {
//  QuickActionsEntry(date: .now, family: .systemSmall)
//}
//
//#Preview("Quick Actions – Medium", as: .systemMedium) {
//  QuickActionsWidget()
//} timeline: {
//  QuickActionsEntry(date: .now, family: .systemMedium)
//}
