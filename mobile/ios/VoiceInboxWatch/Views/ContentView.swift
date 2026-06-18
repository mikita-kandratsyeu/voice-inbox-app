import SwiftUI

struct ContentView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager

    var body: some View {
        TabView {
            RecordView()
                .tabItem {
                    Label(
                        NSLocalizedString("watch.record.tab", comment: ""),
                        systemImage: "mic.fill"
                    )
                }

            RecordingsQueueView()
                .tabItem {
                    Label(
                        NSLocalizedString("watch.queue.tab", comment: ""),
                        systemImage: "list.bullet"
                    )
                }

            TasksView()
                .tabItem {
                    Label(
                        NSLocalizedString("watch.tasks.tab", comment: ""),
                        systemImage: "checkmark.circle"
                    )
                }

            NotesView()
                .tabItem {
                    Label(
                        NSLocalizedString("watch.notes.tab", comment: ""),
                        systemImage: "note.text"
                    )
                }
        }
    }
}
