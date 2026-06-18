import Foundation

// MARK: - Recording Models

struct PendingRecording: Codable, Identifiable {
    let id: String
    let createdAt: Date
    let durationSeconds: Double
    let fileName: String
    var syncState: SyncState
    var transferStartedAt: Date?
    var transferAttempts: Int

    enum SyncState: String, Codable {
        case pending
        case syncing
        case synced
        case failed
    }

    init(
        id: String,
        createdAt: Date,
        durationSeconds: Double,
        fileName: String,
        syncState: SyncState,
        transferStartedAt: Date? = nil,
        transferAttempts: Int = 0
    ) {
        self.id = id
        self.createdAt = createdAt
        self.durationSeconds = durationSeconds
        self.fileName = fileName
        self.syncState = syncState
        self.transferStartedAt = transferStartedAt
        self.transferAttempts = transferAttempts
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        durationSeconds = try container.decode(Double.self, forKey: .durationSeconds)
        fileName = try container.decode(String.self, forKey: .fileName)
        syncState = try container.decode(SyncState.self, forKey: .syncState)
        transferStartedAt = try container.decodeIfPresent(Date.self, forKey: .transferStartedAt)
        transferAttempts = try container.decodeIfPresent(Int.self, forKey: .transferAttempts) ?? 0
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
