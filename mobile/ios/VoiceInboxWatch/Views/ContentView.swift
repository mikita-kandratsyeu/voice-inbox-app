import SwiftUI

struct ContentView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager

    var body: some View {
        TabView {
            RecordView()
            RecordingsQueueView()
            TasksView()
            NotesView()
        }
    }
}
