import SwiftUI

struct TasksView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    @State private var optimisticUpdates: Set<String> = []

    var body: some View {
        NavigationStack {
            Group {
                if let snapshot = sessionManager.snapshot {
                    if snapshot.tasksToday.isEmpty {
                        emptyState(message: "No tasks for today")
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
                    emptyState(message: "Connect iPhone to sync")
                }
            }
            .navigationTitle("Today")
        }
    }

    private func emptyState(message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 40))
                .foregroundColor(.secondary)
            Text(message)
                .font(.caption)
                .foregroundColor(.secondary)
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
                    .foregroundColor(effectiveCompleted ? .green : .gray)

                VStack(alignment: .leading, spacing: 4) {
                    Text(task.text)
                        .font(.body)
                        .strikethrough(effectiveCompleted)
                        .foregroundColor(effectiveCompleted ? .secondary : .primary)

                    if let dueDate = task.dueDate {
                        Text(dueDate)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()
            }
        }
        .buttonStyle(.plain)
    }

    private var effectiveCompleted: Bool {
        isOptimistic ? !task.isCompleted : task.isCompleted
    }
}
