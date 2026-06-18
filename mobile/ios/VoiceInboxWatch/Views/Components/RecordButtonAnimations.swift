import SwiftUI

struct BreathingPulseRings: View {
    let color: Color
    let isActive: Bool

    @State private var pulsing = false

    var body: some View {
        ZStack {
            ForEach(0 ..< 2, id: \.self) { index in
                Circle()
                    .stroke(color.opacity(0.35), lineWidth: 2)
                    .frame(width: 76, height: 76)
                    .scaleEffect(pulsing ? 1.75 : 1.0)
                    .opacity(pulsing ? 0 : 0.55)
                    .animation(
                        .easeOut(duration: 2.4)
                            .repeatForever(autoreverses: false)
                            .delay(Double(index) * 1.2),
                        value: pulsing
                    )
            }
        }
        .allowsHitTesting(false)
        .onAppear {
            if !isActive {
                pulsing = true
            }
        }
        .onChange(of: isActive) { _, active in
            pulsing = !active
        }
    }
}

struct RecordingPulseRings: View {
    let color: Color
    let audioLevel: CGFloat

    @State private var phase = false

    var body: some View {
        ZStack {
            ForEach(0 ..< 3, id: \.self) { index in
                Circle()
                    .stroke(color.opacity(0.25 + Double(audioLevel) * 0.35), lineWidth: 2)
                    .frame(width: 76, height: 76)
                    .scaleEffect(ringScale(for: index))
                    .opacity(ringOpacity(for: index))
            }
        }
        .allowsHitTesting(false)
        .animation(.easeInOut(duration: 0.12), value: audioLevel)
        .onAppear {
            withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                phase = true
            }
        }
    }

    private func ringScale(for index: Int) -> CGFloat {
        let base: CGFloat = 1.0 + CGFloat(index) * 0.12
        let levelBoost = audioLevel * 0.35
        let breathe: CGFloat = phase ? 0.08 : 0
        return base + levelBoost + breathe
    }

    private func ringOpacity(for index: Int) -> Double {
        let base = 0.7 - Double(index) * 0.2
        return max(0.15, base - Double(index) * 0.1)
    }
}

struct RecordingWaveformBars: View {
    let level: CGFloat
    let color: Color

    private let barCount = 7

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0 ..< barCount, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(color)
                    .frame(width: 4, height: barHeight(for: index))
            }
        }
        .frame(height: 40)
        .animation(.easeOut(duration: 0.1), value: level)
    }

    private func barHeight(for index: Int) -> CGFloat {
        let center = CGFloat(barCount - 1) / 2
        let distance = abs(CGFloat(index) - center) / center
        let shape = 1 - distance * 0.45
        let minHeight: CGFloat = 6
        let maxHeight: CGFloat = 36
        let animated = min(1, level * shape + 0.12)
        return minHeight + (maxHeight - minHeight) * animated
    }
}

struct RecordActionButton: View {
    let isRecording: Bool
    let audioLevel: CGFloat
    let action: () -> Void

    @State private var breathing = false

    private var accentColor: Color {
        isRecording ? .red : Color(red: 0.12, green: 0.45, blue: 0.98)
    }

    var body: some View {
        Button(action: action) {
            ZStack {
                ZStack {
                    BreathingPulseRings(color: accentColor, isActive: isRecording)
                        .opacity(isRecording ? 0 : 1)

                    RecordingPulseRings(color: accentColor, audioLevel: audioLevel)
                        .opacity(isRecording ? 1 : 0)
                }
                .animation(.easeInOut(duration: 0.3), value: isRecording)

                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                accentColor.opacity(0.92),
                                accentColor
                            ],
                            center: .center,
                            startRadius: 0,
                            endRadius: 44
                        )
                    )
                    .frame(width: 76, height: 76)
                    .scaleEffect(buttonScale)
                    .animation(
                        isRecording
                            ? .easeOut(duration: 0.1)
                            : .easeInOut(duration: 1.8).repeatForever(autoreverses: true),
                        value: isRecording ? audioLevel : (breathing ? 1 : 0)
                    )
                    .shadow(color: accentColor.opacity(isRecording ? 0.5 : 0.32), radius: isRecording ? 12 : 9)

                ZStack {
                    VoiceWaveformIcon(size: 26, color: .white, lineWidth: 2.4)
                        .opacity(isRecording ? 0 : 1)

                    Image(systemName: "stop.fill")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(.white)
                        .opacity(isRecording ? 1 : 0)
                        .symbolEffect(.pulse, options: .repeating, isActive: isRecording)
                }
                .animation(.easeInOut(duration: 0.2), value: isRecording)
            }
            .frame(width: 120, height: 120)
        }
        .buttonStyle(.plain)
        .onAppear {
            withAnimation(.easeInOut(duration: 1.8).repeatForever(autoreverses: true)) {
                breathing = true
            }
        }
    }

    private var buttonScale: CGFloat {
        if isRecording {
            return 1.0 + audioLevel * 0.06
        }
        return breathing ? 1.03 : 0.97
    }
}
