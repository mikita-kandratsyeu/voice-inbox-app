import Combine
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
    private var reconcileTimer: Timer?

    private let syncTimeout: TimeInterval = 90
    private let maxTransferAttempts = 3

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
        updatedRecording.transferStartedAt = Date()
        store.update(updatedRecording)
        startReconcileTimerIfNeeded()

        session.transferFile(fileURL, metadata: metadata)
        print("Enqueued file transfer: \(recording.id)")
    }

    func flushPendingTransfers() {
        reconcileStuckTransfers()

        let pending = store.getRetryableRecordings()
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
        updatedRecording.transferStartedAt = nil
        updatedRecording.transferAttempts = 0
        store.update(updatedRecording)
        enqueueTransfer(updatedRecording)
    }

    func reconcileStuckTransfers() {
        let now = Date()
        var didChange = false

        for recording in store.recordings {
            guard recording.syncState == .syncing else { continue }

            let startedAt = recording.transferStartedAt ?? recording.createdAt
            guard now.timeIntervalSince(startedAt) >= syncTimeout else { continue }

            var updated = recording
            if updated.transferAttempts + 1 >= maxTransferAttempts {
                updated.syncState = .failed
                updated.transferStartedAt = nil
                print("Transfer timed out for \(recording.id), marking failed")
            } else {
                updated.syncState = .pending
                updated.transferAttempts += 1
                updated.transferStartedAt = nil
                print("Transfer timed out for \(recording.id), retry \(updated.transferAttempts)")
            }

            store.update(updated)
            didChange = true
        }

        if didChange {
            let retryable = store.getRetryableRecordings()
            for recording in retryable where recording.syncState == .pending {
                enqueueTransfer(recording)
            }
        }

        startReconcileTimerIfNeeded()
    }

    private func startReconcileTimerIfNeeded() {
        let hasSyncing = store.recordings.contains { $0.syncState == .syncing }

        if hasSyncing {
            if reconcileTimer == nil {
                reconcileTimer = Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { [weak self] _ in
                    self?.reconcileStuckTransfers()
                }
            }
        } else {
            reconcileTimer?.invalidate()
            reconcileTimer = nil
        }
    }

    private func handleSyncResult(watchRecordingId: String, status: String) {
        guard let recording = store.recordings.first(where: { $0.id == watchRecordingId }) else {
            return
        }

        var updated = recording
        updated.syncState = status == "success" ? .synced : .failed
        updated.transferStartedAt = nil
        store.update(updated)
        print("Sync result for \(watchRecordingId): \(status)")

        if status == "success" {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
                guard let self else { return }
                if let current = self.store.recordings.first(where: { $0.id == watchRecordingId }),
                   current.syncState == .synced {
                    self.store.remove(current)
                }
            }
        }

        startReconcileTimerIfNeeded()
    }
}

// MARK: - WCSessionDelegate

extension WatchSessionManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
            self.isPaired = activationState == .activated
            self.isInstalled = session.isCompanionAppInstalled
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
        guard let type = userInfo["type"] as? String, type == "syncResult" else {
            return
        }

        guard let watchRecordingId = userInfo["watchRecordingId"] as? String,
              let status = userInfo["status"] as? String else {
            return
        }

        DispatchQueue.main.async {
            self.handleSyncResult(watchRecordingId: watchRecordingId, status: status)
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
                    updated.transferStartedAt = nil
                    self.store.update(updated)
                    self.startReconcileTimerIfNeeded()
                } else {
                    print("File transfer completed: \(watchRecordingId)")
                }
            }
        }
    }
}
