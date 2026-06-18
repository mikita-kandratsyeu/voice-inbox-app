import AVFoundation
import Foundation

class WatchAudioRecorder: NSObject, ObservableObject {
    @Published var isRecording = false
    @Published var currentDuration: TimeInterval = 0

    private var audioRecorder: AVAudioRecorder?
    private var recordingURL: URL?
    private var timer: Timer?

    private let maxRecordingDuration: TimeInterval = 180 // 3 minutes

    func startRecording() -> Bool {
        let recordingSession = AVAudioSession.sharedInstance()

        do {
            try recordingSession.setCategory(.record, mode: .default)
            try recordingSession.setActive(true)
        } catch {
            print("Failed to set up recording session: \(error)")
            return false
        }

        let fileName = "\(UUID().uuidString).m4a"
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let recordingsDir = documentsPath.appendingPathComponent("watch-recordings")

        do {
            try FileManager.default.createDirectory(at: recordingsDir, withIntermediateDirectories: true)
        } catch {
            print("Failed to create recordings directory: \(error)")
            return false
        }

        recordingURL = recordingsDir.appendingPathComponent(fileName)

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]

        do {
            audioRecorder = try AVAudioRecorder(url: recordingURL!, settings: settings)
            audioRecorder?.delegate = self
            audioRecorder?.record()

            isRecording = true
            currentDuration = 0

            timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
                guard let self = self else { return }
                self.currentDuration = self.audioRecorder?.currentTime ?? 0

                if self.currentDuration >= self.maxRecordingDuration {
                    self.stopRecording()
                }
            }

            return true
        } catch {
            print("Failed to start recording: \(error)")
            return false
        }
    }

    func stopRecording() -> PendingRecording? {
        guard isRecording, let url = recordingURL else { return nil }

        audioRecorder?.stop()
        timer?.invalidate()
        timer = nil

        let duration = currentDuration
        isRecording = false
        currentDuration = 0

        let recording = PendingRecording(
            id: UUID().uuidString,
            createdAt: Date(),
            durationSeconds: duration,
            fileName: url.lastPathComponent,
            syncState: .pending
        )

        audioRecorder = nil
        recordingURL = nil

        return recording
    }
}

extension WatchAudioRecorder: AVAudioRecorderDelegate {
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        if !flag {
            print("Recording finished unsuccessfully")
            isRecording = false
            timer?.invalidate()
            timer = nil
        }
    }
}
