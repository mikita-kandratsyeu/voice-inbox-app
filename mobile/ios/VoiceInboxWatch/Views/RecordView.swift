import SwiftUI

struct RecordView: View {
    @StateObject private var recorder = WatchAudioRecorder()
    @StateObject private var store = PendingRecordingStore.shared
    @EnvironmentObject var sessionManager: WatchSessionManager

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                if !sessionManager.isPaired {
                    Text("Connect to iPhone")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } else if !sessionManager.isInstalled {
                    Text("Install app on iPhone")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                if recorder.isRecording {
                    Text(formatDuration(recorder.currentDuration))
                        .font(.system(size: 40, weight: .bold, design: .monospaced))
                        .foregroundColor(.red)

                    Text("Recording...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } else {
                    Image(systemName: "mic.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.blue)
                }

                Spacer()

                Button(action: toggleRecording) {
                    ZStack {
                        Circle()
                            .fill(recorder.isRecording ? Color.red : Color.blue)
                            .frame(width: 70, height: 70)

                        Image(systemName: recorder.isRecording ? "stop.fill" : "mic.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.white)
                    }
                }
                .buttonStyle(.plain)

                if store.getPendingRecordings().count > 0 {
                    Text("\(store.getPendingRecordings().count) in queue")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Record")
        }
    }

    private func toggleRecording() {
        if recorder.isRecording {
            if let recording = recorder.stopRecording() {
                store.add(recording)
            }
        } else {
            _ = recorder.startRecording()
        }
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}
