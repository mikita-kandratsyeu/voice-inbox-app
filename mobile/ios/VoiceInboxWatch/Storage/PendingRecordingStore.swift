import Foundation

class PendingRecordingStore: ObservableObject {
    static let shared = PendingRecordingStore()

    @Published var recordings: [PendingRecording] = []

    private let storeURL: URL
    private let maxQueueSize = 10

    private init() {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        storeURL = documentsPath.appendingPathComponent("pending-recordings.json")
        load()
    }

    func add(_ recording: PendingRecording) {
        recordings.append(recording)

        // Enforce max queue size
        if recordings.count > maxQueueSize {
            // Remove oldest recordings
            let toRemove = recordings.prefix(recordings.count - maxQueueSize)
            for rec in toRemove {
                deleteRecordingFile(rec)
            }
            recordings = Array(recordings.suffix(maxQueueSize))
        }

        save()
        WatchSessionManager.shared.enqueueTransfer(recording)
    }

    func update(_ recording: PendingRecording) {
        if let index = recordings.firstIndex(where: { $0.id == recording.id }) {
            recordings[index] = recording
            save()
        }
    }

    func remove(_ recording: PendingRecording) {
        recordings.removeAll { $0.id == recording.id }
        deleteRecordingFile(recording)
        save()
    }

    func getPendingRecordings() -> [PendingRecording] {
        recordings.filter { $0.syncState == .pending || $0.syncState == .failed }
    }

    private func load() {
        guard FileManager.default.fileExists(atPath: storeURL.path) else {
            recordings = []
            return
        }

        do {
            let data = try Data(contentsOf: storeURL)
            recordings = try JSONDecoder().decode([PendingRecording].self, from: data)
        } catch {
            print("Failed to load recordings: \(error)")
            recordings = []
        }
    }

    private func save() {
        do {
            let data = try JSONEncoder().encode(recordings)
            try data.write(to: storeURL)
        } catch {
            print("Failed to save recordings: \(error)")
        }
    }

    private func deleteRecordingFile(_ recording: PendingRecording) {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let recordingsDir = documentsPath.appendingPathComponent("watch-recordings")
        let fileURL = recordingsDir.appendingPathComponent(recording.fileName)

        do {
            try FileManager.default.removeItem(at: fileURL)
        } catch {
            print("Failed to delete recording file: \(error)")
        }
    }

    func getRecordingURL(_ recording: PendingRecording) -> URL {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let recordingsDir = documentsPath.appendingPathComponent("watch-recordings")
        return recordingsDir.appendingPathComponent(recording.fileName)
    }
}
