import Foundation
import WatchConnectivity

class WatchSessionManager: NSObject, ObservableObject {
    static let shared = WatchSessionManager()

    @Published var snapshot: WatchSnapshot?
    @Published var isReachable = false
    @Published var isPaired = false
    @Published var isInstalled = false

    private let store = PendingRecordingStore.shared
    private var session: WCSession?

    private override init() {
        super.init()

        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
    }

    func enqueueTransfer(_ recording: PendingRecording) {
        guard let session = session, session.activationState == .activated else {
            print("Session not activated, will retry later")
            return
        }

        let fileURL = store.getRecordingURL(recording)

        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            print("Recording file not found: \(fileURL.path)")
            var updatedRecording = recording
            updatedRecording.syncState = .failed
            store.update(updatedRecording)
            return
        }

        let metadata: [String: Any] = [
            "watchRecordingId": recording.id,
            "createdAt": ISO8601DateFormatter().string(from: recording.createdAt),
            "durationSeconds": recording.durationSeconds,
            "source": "watch"
        ]

        var updatedRecording = recording
        updatedRecording.syncState = .syncing
        store.update(updatedRecording)

        session.transferFile(fileURL, metadata: metadata)
        print("Enqueued file transfer: \(recording.id)")
    }

    func flushPendingTransfers() {
        let pending = store.getPendingRecordings()
        for recording in pending {
            enqueueTransfer(recording)
        }
    }

    func sendCommand(_ command: WatchCommand) {
        guard let session = session, session.activationState == .activated else {
            print("Session not activated, cannot send command")
            return
        }

        do {
            let data = try JSONEncoder().encode(command)
            let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
            session.transferUserInfo(dict)
            print("Sent command: \(command.type.rawValue)")
        } catch {
            print("Failed to send command: \(error)")
        }
    }

    func retryFailedTransfer(_ recording: PendingRecording) {
        var updatedRecording = recording
        updatedRecording.syncState = .pending
        store.update(updatedRecording)
        enqueueTransfer(updatedRecording)
    }
}

// MARK: - WCSessionDelegate

extension WatchSessionManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
            self.isPaired = session.isPaired
            self.isInstalled = session.isWatchAppInstalled
        }

        if activationState == .activated {
            print("Watch session activated")
            flushPendingTransfers()
        }

        if let error = error {
            print("Session activation error: \(error)")
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }

        if session.isReachable {
            print("iPhone became reachable, flushing pending transfers")
            flushPendingTransfers()
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        guard let snapshotJson = applicationContext["snapshotJson"] as? String,
              let data = snapshotJson.data(using: .utf8) else {
            print("Invalid application context format")
            return
        }

        do {
            let decoder = JSONDecoder()
            let snapshot = try decoder.decode(WatchSnapshot.self, from: data)
            DispatchQueue.main.async {
                self.snapshot = snapshot
                print("Received snapshot update: \(snapshot.tasksToday.count) tasks, \(snapshot.recentNotes.count) notes")
            }
        } catch {
            print("Failed to decode snapshot: \(error)")
        }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        // Handle sync result from iPhone
        guard let type = userInfo["type"] as? String, type == "syncResult" else {
            return
        }

        guard let watchRecordingId = userInfo["watchRecordingId"] as? String,
              let status = userInfo["status"] as? String else {
            return
        }

        DispatchQueue.main.async {
            if let recording = self.store.recordings.first(where: { $0.id == watchRecordingId }) {
                var updated = recording
                updated.syncState = status == "success" ? .synced : .failed
                self.store.update(updated)
                print("Sync result for \(watchRecordingId): \(status)")
            }
        }
    }

    func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: Error?) {
        guard let metadata = fileTransfer.file.metadata,
              let watchRecordingId = metadata["watchRecordingId"] as? String else {
            return
        }

        DispatchQueue.main.async {
            if let recording = self.store.recordings.first(where: { $0.id == watchRecordingId }) {
                if let error = error {
                    print("File transfer failed: \(error)")
                    var updated = recording
                    updated.syncState = .failed
                    self.store.update(updated)
                } else {
                    print("File transfer completed: \(watchRecordingId)")
                    // Keep as .syncing until we get syncResult from iPhone
                }
            }
        }
    }
}
