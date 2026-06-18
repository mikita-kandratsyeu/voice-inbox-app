import Foundation

// MARK: - Recording Models

struct PendingRecording: Codable, Identifiable {
    let id: String
    let createdAt: Date
    let durationSeconds: Double
    let fileName: String
    var syncState: SyncState

    enum SyncState: String, Codable {
        case pending
        case syncing
        case synced
        case failed
    }
}

// MARK: - Snapshot Models

struct WatchSnapshot: Codable {
    let updatedAt: String
    let tasksToday: [WatchTask]
    let recentNotes: [WatchNote]
    let schemaVersion: Int
}

struct WatchTask: Codable, Identifiable {
    let id: String
    let recordId: String
    let text: String
    let isCompleted: Bool
    let dueDate: String?
}

struct WatchNote: Codable, Identifiable {
    let id: String
    let title: String
    let summary: String
    let createdAt: String
}

// MARK: - Command Models

struct WatchCommand: Codable {
    let type: CommandType
    let taskId: String?
    let recordId: String?

    enum CommandType: String, Codable {
        case toggleTask
        case openNote
    }
}

struct SyncResultCommand: Codable {
    let type: String = "syncResult"
    let watchRecordingId: String
    let status: String
    let recordId: String?
}

// MARK: - Metadata

struct RecordingMetadata: Codable {
    let watchRecordingId: String
    let createdAt: String
    let durationSeconds: Double
    let source: String = "watch"
}
