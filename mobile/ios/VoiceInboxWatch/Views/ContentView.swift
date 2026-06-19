import SwiftUI

struct ContentView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    @State private var selection = 0

    var body: some View {
        TabView(selection: $selection) {
            RecordView()
                .tag(0)
                .containerBackground(.black.gradient, for: .tabView)

            RecordingsQueueView()
                .tag(1)
                .containerBackground(.black.gradient, for: .tabView)

            TasksView()
                .tag(2)
                .containerBackground(.black.gradient, for: .tabView)

            NotesView()
                .tag(3)
                .containerBackground(.black.gradient, for: .tabView)
        }
        .tabViewStyle(.verticalPage)
        .containerBackground(.black.gradient, for: .navigation)
    }
}
