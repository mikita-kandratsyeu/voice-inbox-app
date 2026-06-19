import SwiftUI
import WatchKit

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
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button {
                                        toggleTask(task)
                                    } label: {
                                        Label(
                                            task.isCompleted ? "Incomplete" : "Complete",
                                            systemImage: task.isCompleted ? "circle" : "checkmark.circle.fill"
                                        )
                                    }
                                    .tint(task.isCompleted ? .orange : .green)
                                }
                            }
                        }
                        .listStyle(.carousel)
                    }
                } else {
                    emptyState(message: NSLocalizedString("watch.tasks.sync_required", comment: ""))
                }
            }
            .navigationTitle(NSLocalizedString("watch.tasks.title", comment: ""))
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Label(NSLocalizedString("watch.tasks.title", comment: ""), systemImage: "checkmark.circle")
                        .labelStyle(.iconOnly)
                        .foregroundStyle(.white.opacity(0.8))
                        .font(.system(size: 20))
                }
            }
        }
    }

    private func emptyState(message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 44))
                .foregroundStyle(.green.opacity(0.6))
                .symbolEffect(.bounce)
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 8)
        }
        .padding(.vertical, 20)
    }

    private func toggleTask(_ task: WatchTask) {
        WKInterfaceDevice.current().play(.click)
        optimisticUpdates.insert(task.id)

        let command = WatchCommand(
            type: .toggleTask,
            taskId: task.id,
            recordId: task.recordId
        )
        sessionManager.sendCommand(command)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            WKInterfaceDevice.current().play(.success)
        }

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
            HStack(alignment: .center, spacing: 10) {
                Image(systemName: effectiveCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundStyle(effectiveCompleted ? .green : .gray)
                    .frame(width: 32, height: 32)
                    .symbolEffect(.bounce, value: effectiveCompleted)

                VStack(alignment: .leading, spacing: 3) {
                    Text(task.text)
                        .font(.system(size: 16, weight: .medium))
                        .strikethrough(effectiveCompleted)
                        .foregroundStyle(effectiveCompleted ? .secondary : .primary)
                        .lineLimit(2)
                        .minimumScaleFactor(0.9)
                        .multilineTextAlignment(.leading)
                        .animation(.easeInOut(duration: 0.2), value: effectiveCompleted)

                    if let dueDate = task.dueDate {
                        Text(WatchDateFormatting.displayDueFromPayload(dueDate))
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer(minLength: 0)
            }
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var effectiveCompleted: Bool {
        isOptimistic ? !task.isCompleted : task.isCompleted
    }
}
