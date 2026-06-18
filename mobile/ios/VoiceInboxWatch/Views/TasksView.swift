import SwiftUI

struct TasksView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    @State private var optimisticUpdates: Set<String> = []

    var body: some View {
        NavigationStack {
            Group {
                if let snapshot = sessionManager.snapshot {
                    if snapshot.tasksToday.isEmpty {
                        emptyState(message: NSLocalizedString("watch.tasks.empty", comment: ""))
                    } else {
                        List {
                            ForEach(snapshot.tasksToday) { task in
                                TaskRow(
                                    task: task,
                                    isOptimistic: optimisticUpdates.contains(task.id),
                                    onToggle: {
                                        toggleTask(task)
                                    }
                                )
                            }
                        }
                    }
                } else {
                    emptyState(message: NSLocalizedString("watch.tasks.sync_required", comment: ""))
                }
            }
            .navigationTitle(NSLocalizedString("watch.tasks.title", comment: ""))
        }
    }

    private func emptyState(message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 40))
                .foregroundStyle(.secondary)
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private func toggleTask(_ task: WatchTask) {
        optimisticUpdates.insert(task.id)

        let command = WatchCommand(
            type: .toggleTask,
            taskId: task.id,
            recordId: task.recordId
        )
        sessionManager.sendCommand(command)

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            optimisticUpdates.remove(task.id)
        }
    }
}

struct TaskRow: View {
    let task: WatchTask
    let isOptimistic: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: effectiveCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundStyle(effectiveCompleted ? .green : .gray)

                VStack(alignment: .leading, spacing: 4) {
                    Text(task.text)
                        .font(.body)
                        .strikethrough(effectiveCompleted)
                        .foregroundStyle(effectiveCompleted ? .secondary : .primary)
                        .lineLimit(3)
                        .minimumScaleFactor(0.85)
                        .multilineTextAlignment(.leading)

                    if let dueDate = task.dueDate {
                        Text(WatchDateFormatting.displayDueFromPayload(dueDate))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer(minLength: 0)
            }
        }
        .buttonStyle(.plain)
    }

    private var effectiveCompleted: Bool {
        isOptimistic ? !task.isCompleted : task.isCompleted
    }
}
