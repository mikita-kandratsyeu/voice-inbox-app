import SwiftUI
import WatchKit

private enum RecordLayout {
    static let meterHeight: CGFloat = 36
    static let statusHeight: CGFloat = 62
    static let buttonSize: CGFloat = 112
    static let sectionSpacing: CGFloat = 8
}

struct RecordView: View {
    @StateObject private var recorder = WatchAudioRecorder()
    @StateObject private var store = PendingRecordingStore.shared
    @EnvironmentObject var sessionManager: WatchSessionManager

    private var queueCount: Int {
        store.getPendingRecordings().count
    }

    var body: some View {
        ZStack {
            background

            VStack(spacing: 0) {
                topBar
                    .frame(height: 28)

                Spacer(minLength: 0)

                meterSlot

                RecordActionButton(
                    isRecording: recorder.isRecording,
                    audioLevel: CGFloat(recorder.audioLevel),
                    action: toggleRecording
                )
                .frame(width: RecordLayout.buttonSize, height: RecordLayout.buttonSize)
                .padding(.vertical, RecordLayout.sectionSpacing)

                statusSlot

                Spacer(minLength: 0)
            }
            .padding(.horizontal, 10)
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var background: some View {
        RadialGradient(
            colors: [
                Color(red: 0.07, green: 0.09, blue: 0.16),
                Color.black
            ],
            center: .center,
            startRadius: 4,
            endRadius: 130
        )
        .ignoresSafeArea()
    }

    private var topBar: some View {
        HStack(alignment: .top) {
            connectionBanner
                .frame(maxWidth: .infinity, alignment: .leading)

            if queueCount > 0 {
                queueBadge
            }
        }
    }

    private var meterSlot: some View {
        ZStack {
            if recorder.isRecording {
                RecordingWaveformBars(
                    level: CGFloat(recorder.audioLevel),
                    color: .red.opacity(0.85)
                )
                .transition(.opacity)
            }
        }
        .frame(height: RecordLayout.meterHeight)
        .animation(.easeInOut(duration: 0.25), value: recorder.isRecording)
    }

    private var statusSlot: some View {
        ZStack {
            if recorder.isRecording {
                VStack(spacing: 4) {
                    Text(formatDuration(recorder.currentDuration))
                        .font(.system(size: 26, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                        .contentTransition(.numericText())

                    Text(NSLocalizedString("watch.record.recording", comment: ""))
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.55))
                }
                .transition(.opacity)
            } else {
                Text(NSLocalizedString("watch.record.tap_hint", comment: ""))
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.white.opacity(0.78))
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
                    .minimumScaleFactor(0.8)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 4)
                    .transition(.opacity)
            }
        }
        .frame(height: RecordLayout.statusHeight)
        .animation(.easeInOut(duration: 0.25), value: recorder.isRecording)
    }

    @ViewBuilder
    private var connectionBanner: some View {
        if !sessionManager.isPaired {
            Text(NSLocalizedString("watch.record.connecting", comment: ""))
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        } else if !sessionManager.isInstalled {
            Text(NSLocalizedString("watch.record.install_required", comment: ""))
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
    }

    private var queueBadge: some View {
        Text("\(queueCount)")
            .font(.caption2.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(
                Capsule(style: .continuous)
                    .fill(Color.white.opacity(0.14))
            )
            .accessibilityLabel(
                String(format: NSLocalizedString("watch.record.queue_count", comment: ""), queueCount)
            )
    }

    private func toggleRecording() {
        WKInterfaceDevice.current().play(.click)

        if recorder.isRecording {
            if let recording = recorder.stopRecording() {
                store.add(recording)
                WKInterfaceDevice.current().play(.success)
            }
        } else {
            if recorder.startRecording() {
                WKInterfaceDevice.current().play(.start)
            } else {
                WKInterfaceDevice.current().play(.failure)
            }
        }
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}
