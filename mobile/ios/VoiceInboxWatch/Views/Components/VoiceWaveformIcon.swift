import SwiftUI

/// Matches the main app's LucideConnection AudioWaveform — vertical bars read better than a mic at small sizes.
struct VoiceWaveformIcon: View {
    var size: CGFloat = 24
    var color: Color = .white
    var lineWidth: CGFloat = 2.2

    private let barHeights: [CGFloat] = [0.34, 0.58, 0.92, 0.52, 0.38]

    var body: some View {
        HStack(alignment: .center, spacing: max(2, size * 0.11)) {
            ForEach(Array(barHeights.enumerated()), id: \.offset) { _, height in
                RoundedRectangle(cornerRadius: lineWidth / 2, style: .continuous)
                    .fill(color)
                    .frame(width: lineWidth, height: size * height)
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}
