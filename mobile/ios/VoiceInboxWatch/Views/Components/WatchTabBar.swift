import SwiftUI
import WatchKit

enum WatchTab: CaseIterable, Hashable {
    case record
    case queue
    case tasks
    case notes

    var accessibilityLabel: String {
        switch self {
        case .record:
            return NSLocalizedString("watch.record.tab", comment: "")
        case .queue:
            return NSLocalizedString("watch.queue.tab", comment: "")
        case .tasks:
            return NSLocalizedString("watch.tasks.tab", comment: "")
        case .notes:
            return NSLocalizedString("watch.notes.tab", comment: "")
        }
    }

    var systemImage: String {
        switch self {
        case .record:
            return "waveform"
        case .queue:
            return "tray.full.fill"
        case .tasks:
            return "checkmark.circle.fill"
        case .notes:
            return "doc.text.fill"
        }
    }
}

struct WatchTabBar: View {
    @Binding var selectedTab: WatchTab

    private let iconSize: CGFloat = 20
    private let barHeight: CGFloat = 38

    var body: some View {
        HStack(spacing: 4) {
            ForEach(WatchTab.allCases, id: \.self) { tab in
                tabButton(for: tab)
            }
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 5)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.white.opacity(0.1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.white.opacity(0.08), lineWidth: 0.5)
        )
        .padding(.horizontal, 8)
        .padding(.bottom, 4)
    }

    private func tabButton(for tab: WatchTab) -> some View {
        let isSelected = selectedTab == tab

        return Button {
            guard selectedTab != tab else { return }
            WKInterfaceDevice.current().play(.click)
            withAnimation(.easeInOut(duration: 0.2)) {
                selectedTab = tab
            }
        } label: {
            ZStack {
                if isSelected {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color.white.opacity(0.16))
                }

                tabIcon(for: tab, isSelected: isSelected)
            }
            .frame(maxWidth: .infinity)
            .frame(height: barHeight)
            .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(tab.accessibilityLabel)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    @ViewBuilder
    private func tabIcon(for tab: WatchTab, isSelected: Bool) -> some View {
        let tint = isSelected ? Color.white : Color.white.opacity(0.45)

        if tab == .record {
            VoiceWaveformIcon(size: iconSize, color: tint, lineWidth: 2.1)
        } else {
            Image(systemName: tab.systemImage)
                .font(.system(size: iconSize, weight: .semibold))
                .foregroundStyle(tint)
                .symbolRenderingMode(.monochrome)
        }
    }
}

struct WatchTabScaffold<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .padding(.bottom, 46)
    }
}
