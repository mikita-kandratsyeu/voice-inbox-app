import SwiftUI

struct ContentView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    @State private var selectedTab: WatchTab = .record

    var body: some View {
        ZStack(alignment: .bottom) {
            WatchTabScaffold {
                tabContent
            }

            WatchTabBar(selectedTab: $selectedTab)
        }
        .background(Color.black)
    }

    @ViewBuilder
    private var tabContent: some View {
        switch selectedTab {
        case .record:
            RecordView()
        case .queue:
            RecordingsQueueView()
        case .tasks:
            TasksView()
        case .notes:
            NotesView()
        }
    }
}
