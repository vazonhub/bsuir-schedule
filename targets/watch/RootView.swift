import SwiftUI

/// Entry view: routes to the day pager when a snapshot exists, otherwise shows
/// the "open on phone" prompt.
struct RootView: View {
  @EnvironmentObject private var store: WatchStore

  var body: some View {
    NavigationStack {
      Group {
        if let snapshot = store.snapshot {
          DaysPagerView(snapshot: snapshot)
        } else {
          OpenOnPhoneView(locale: store.locale)
        }
      }
      .navigationDestination(for: WatchLesson.self) { lesson in
        if let snapshot = store.snapshot {
          LessonDetailView(lesson: lesson, snapshot: snapshot)
        }
      }
    }
    .task {
      store.refreshFromAPIIfNeeded()
    }
  }
}

/// Horizontally paged days (swipe left/right), starting on today.
struct DaysPagerView: View {
  let snapshot: WatchSnapshot
  @State private var selection: Int

  init(snapshot: WatchSnapshot) {
    self.snapshot = snapshot
    _selection = State(initialValue: snapshot.todayIndex())
  }

  var body: some View {
    TabView(selection: $selection) {
      ForEach(Array(snapshot.days.enumerated()), id: \.element.id) { index, day in
        DayView(day: day, snapshot: snapshot)
          .tag(index)
      }
    }
    .tabViewStyle(.verticalPage)
  }
}
