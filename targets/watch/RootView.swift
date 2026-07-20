import SwiftUI

/// Entry view: routes to the day pager when a snapshot exists, otherwise shows
/// a loading / error / "open on phone" state. A toolbar button opens the
/// group/teacher picker.
struct RootView: View {
  @EnvironmentObject private var store: WatchStore
  @State private var showPicker = false

  var body: some View {
    NavigationStack {
      content
        .navigationDestination(for: WatchLesson.self) { lesson in
          if let snapshot = store.snapshot {
            LessonDetailView(lesson: lesson, snapshot: snapshot)
          }
        }
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            Button {
              showPicker = true
            } label: {
              Image(systemName: "magnifyingglass")
            }
            .accessibilityLabel(L10n.strings(for: store.locale).pickTitle)
          }
        }
    }
    .sheet(isPresented: $showPicker) {
      NavigationStack { SchedulePickerView() }
        .environmentObject(store)
    }
    .task {
      store.refreshFromAPIIfNeeded()
    }
  }

  @ViewBuilder private var content: some View {
    if let snapshot = store.snapshot {
      DaysPagerView(snapshot: snapshot)
    } else if store.isRefreshing {
      loadingView
    } else if store.fetchFailed {
      errorView
    } else {
      OpenOnPhoneView(locale: store.locale) { showPicker = true }
    }
  }

  private var loadingView: some View {
    let s = L10n.strings(for: store.locale)
    return VStack(spacing: 8) {
      ProgressView()
      Text(s.loading).font(.footnote).foregroundStyle(.secondary)
    }
  }

  private var errorView: some View {
    let s = L10n.strings(for: store.locale)
    return VStack(spacing: 8) {
      Image(systemName: "wifi.exclamationmark")
        .font(.title3)
        .foregroundStyle(.orange)
      Text(s.errorTitle).font(.headline).multilineTextAlignment(.center)
      Button(s.retry) { store.refreshFromAPIIfNeeded() }
    }
    .padding()
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
