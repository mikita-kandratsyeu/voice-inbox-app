import SwiftUI

struct ContentView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager

    var body: some View {
        TabView {
            RecordView()
                .tabItem {
                    Label("Record", systemImage: "mic.fill")
                }

            RecordingsQueueView()
                .tabItem {
                    Label("Queue", systemImage: "list.bullet")
                }

            TasksView()
                .tabItem {
                    Label("Tasks", systemImage: "checkmark.circle")
                }

            NotesView()
                .tabItem {
                    Label("Notes", systemImage: "note.text")
                }
        }
    }
}
