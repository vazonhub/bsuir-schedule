import SwiftUI

/// Watch-side group / teacher switcher. Searches the BSUIR API and, on tap,
/// makes the choice the active override in `WatchStore`. Recent choices are
/// offered when the query is empty.
struct SchedulePickerView: View {
  @EnvironmentObject private var store: WatchStore
  @Environment(\.dismiss) private var dismiss

  @State private var kind: WatchSelection.Kind = .group
  @State private var query = ""
  @State private var groupHits: [GroupHit] = []
  @State private var employeeHits: [EmployeeHit] = []
  @State private var searching = false
  @State private var searchTask: Task<Void, Never>?

  private var l: L10n.Strings { L10n.strings(for: store.locale) }

  var body: some View {
    List {
      HStack(spacing: 6) {
        kindButton(.group, l.pickGroup)
        kindButton(.employee, l.pickTeacher)
      }
      .listRowBackground(Color.clear)

      TextField(
        kind == .group ? l.searchGroupPrompt : l.searchTeacherPrompt, text: $query
      )
      .onSubmit { runSearch() }

      if store.selection != nil {
        Button(role: .destructive) {
          store.clearSelection()
          dismiss()
        } label: {
          Label(l.backToPinned, systemImage: "pin.slash")
        }
      }

      content
    }
    .navigationTitle(l.pickTitle)
    .onChange(of: query) { _, _ in runSearch() }
    .onChange(of: kind) { _, _ in
      groupHits = []
      employeeHits = []
      runSearch()
    }
  }

  @ViewBuilder private var content: some View {
    if query.trimmingCharacters(in: .whitespaces).isEmpty {
      if !store.recents.isEmpty {
        Section(l.recent) {
          ForEach(store.recents) { sel in
            Button { choose(sel) } label: { recentRow(sel) }
          }
        }
      }
    } else if searching {
      HStack {
        ProgressView()
        Text(l.searching).foregroundStyle(.secondary)
      }
    } else {
      resultsSection
    }
  }

  @ViewBuilder private var resultsSection: some View {
    switch kind {
    case .group:
      if groupHits.isEmpty {
        Text(l.nothingFound).foregroundStyle(.secondary)
      } else {
        ForEach(groupHits) { hit in
          Button(hit.name) { store.selectGroup(name: hit.name); dismiss() }
        }
      }
    case .employee:
      if employeeHits.isEmpty {
        Text(l.nothingFound).foregroundStyle(.secondary)
      } else {
        ForEach(employeeHits) { hit in
          Button(hit.displayName) {
            store.selectEmployee(urlId: hit.urlId, displayName: hit.displayName)
            dismiss()
          }
        }
      }
    }
  }

  private func kindButton(_ k: WatchSelection.Kind, _ title: String) -> some View {
    Button {
      kind = k
    } label: {
      Text(title)
        .font(.caption)
        .lineLimit(1)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 4)
        .background(
          kind == k ? Color.accentColor.opacity(0.35) : Color.white.opacity(0.08),
          in: Capsule())
    }
    .buttonStyle(.plain)
  }

  private func recentRow(_ sel: WatchSelection) -> some View {
    Label(
      sel.displayName,
      systemImage: sel.kind == .group ? "person.3.fill" : "person.fill"
    )
  }

  private func choose(_ sel: WatchSelection) {
    switch sel.kind {
    case .group: store.selectGroup(name: sel.value)
    case .employee: store.selectEmployee(urlId: sel.value, displayName: sel.displayName)
    }
    dismiss()
  }

  /// Debounced search: cancels the in-flight task and waits 300 ms before hitting
  /// the API, so typing doesn't fire a request per keystroke.
  private func runSearch() {
    let q = query.trimmingCharacters(in: .whitespaces)
    let currentKind = kind
    searchTask?.cancel()
    guard !q.isEmpty else {
      groupHits = []
      employeeHits = []
      searching = false
      return
    }
    searching = true
    searchTask = Task {
      try? await Task.sleep(nanoseconds: 300_000_000)
      if Task.isCancelled { return }
      switch currentKind {
      case .group:
        let hits = await BsuirAPI.searchGroups(query: q)
        if Task.isCancelled { return }
        await MainActor.run {
          self.groupHits = hits
          self.searching = false
        }
      case .employee:
        let hits = await BsuirAPI.searchEmployees(query: q)
        if Task.isCancelled { return }
        await MainActor.run {
          self.employeeHits = hits
          self.searching = false
        }
      }
    }
  }
}
