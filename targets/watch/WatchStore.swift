import Combine
import Foundation
import WatchConnectivity

/// Single source of truth for the watch UI.
///
/// Two data sources feed the displayed schedule:
///   • the phone-pushed `WatchSnapshot` (pinned `defaultGroup`) — the default;
///   • a manual override chosen on the watch (`WatchSelection`, group or
///     teacher) that the watch fetches from the BSUIR API itself.
///
/// The phone snapshot is always kept (App-Group `UserDefaults`), so clearing an
/// override instantly restores the pinned group offline. The active override
/// snapshot is cached separately under its own key.
final class WatchStore: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = WatchStore()

  /// The snapshot currently shown (phone-pushed one, or the active override).
  @Published private(set) var snapshot: WatchSnapshot?
  /// Active manual override, or nil when showing the phone's pinned group.
  @Published private(set) var selection: WatchSelection?
  /// Recently viewed manual selections (most recent first).
  @Published private(set) var recents: [WatchSelection] = []
  @Published var isRefreshing = false
  @Published var fetchFailed = false

  let appGroup = "group.by.vazon.bsuirschedule"
  private let phoneKey = "watchSnapshot"
  private let overrideKey = "watchOverrideSnapshot"
  private let selectionKey = "watchSelection"
  private let recentsKey = "watchRecents"
  private let maxRecents = 8

  /// Phone-pushed snapshot (pinned group). Preserved across overrides.
  private var phoneSnapshot: WatchSnapshot?
  /// Cached snapshot for the active override.
  private var overrideSnapshot: WatchSnapshot?

  private override init() {
    super.init()
    loadFromDisk()
    activateSession()
  }

  private var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

  // MARK: - Persistence

  private func loadFromDisk() {
    if let raw = defaults?.string(forKey: phoneKey) { phoneSnapshot = decode(raw) }
    if let data = defaults?.data(forKey: selectionKey),
      let sel = try? JSONDecoder().decode(WatchSelection.self, from: data)
    {
      selection = sel
      if let raw = defaults?.string(forKey: overrideKey) { overrideSnapshot = decode(raw) }
    }
    if let data = defaults?.data(forKey: recentsKey),
      let list = try? JSONDecoder().decode([WatchSelection].self, from: data)
    {
      recents = list
    }
    snapshot = displayed
  }

  private func decode(_ json: String) -> WatchSnapshot? {
    guard let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WatchSnapshot.self, from: data)
  }

  private func encode(_ snapshot: WatchSnapshot) -> String? {
    guard let data = try? JSONEncoder().encode(snapshot) else { return nil }
    return String(data: data, encoding: .utf8)
  }

  /// The snapshot that should be shown given the current selection.
  private var displayed: WatchSnapshot? {
    selection == nil ? phoneSnapshot : overrideSnapshot
  }

  /// Persist the phone-pushed snapshot and republish if it's the active source.
  func ingest(json: String) {
    guard let decoded = decode(json) else { return }
    defaults?.set(json, forKey: phoneKey)
    DispatchQueue.main.async {
      self.phoneSnapshot = decoded
      if self.selection == nil {
        self.snapshot = decoded
        self.fetchFailed = false
      }
    }
  }

  // MARK: - Manual selection (watch-side group/teacher switching)

  func selectGroup(name: String) {
    apply(WatchSelection(kind: .group, value: name, displayName: name))
  }

  func selectEmployee(urlId: String, displayName: String) {
    apply(WatchSelection(kind: .employee, value: urlId, displayName: displayName))
  }

  /// Switch back to the phone's pinned group.
  func clearSelection() {
    selection = nil
    overrideSnapshot = nil
    fetchFailed = false
    isRefreshing = false
    defaults?.removeObject(forKey: selectionKey)
    defaults?.removeObject(forKey: overrideKey)
    snapshot = phoneSnapshot
  }

  private func apply(_ sel: WatchSelection) {
    selection = sel
    overrideSnapshot = nil
    snapshot = nil  // triggers the loading state until the fetch resolves
    fetchFailed = false
    if let data = try? JSONEncoder().encode(sel) {
      defaults?.set(data, forKey: selectionKey)
    }
    addRecent(sel)
    fetchOverride(sel)
  }

  private func addRecent(_ sel: WatchSelection) {
    var next = recents.filter { $0.id != sel.id }
    next.insert(sel, at: 0)
    if next.count > maxRecents { next = Array(next.prefix(maxRecents)) }
    recents = next
    if let data = try? JSONEncoder().encode(next) {
      defaults?.set(data, forKey: recentsKey)
    }
  }

  private func fetchOverride(_ sel: WatchSelection) {
    isRefreshing = true
    fetchFailed = false
    let meta = currentMeta()
    Task {
      let result: WatchSnapshot?
      switch sel.kind {
      case .group:
        result = await BsuirAPI.fetchGroupWindow(
          group: sel.value, displayName: sel.displayName, meta: meta)
      case .employee:
        result = await BsuirAPI.fetchEmployeeWindow(
          urlId: sel.value, displayName: sel.displayName, meta: meta)
      }
      await MainActor.run {
        // Ignore a stale result if the user changed selection meanwhile.
        guard self.selection?.id == sel.id else { return }
        self.isRefreshing = false
        if let result = result {
          self.overrideSnapshot = result
          if let json = self.encode(result) { self.defaults?.set(json, forKey: self.overrideKey) }
          self.snapshot = result
        } else {
          self.fetchFailed = true
        }
      }
    }
  }

  /// Metadata for building an API snapshot: borrow theme/locale/strings from any
  /// cached snapshot, else fall back to built-in defaults.
  private func currentMeta() -> WatchMeta {
    if let base = phoneSnapshot ?? overrideSnapshot {
      return WatchMeta(theme: base.theme, locale: base.locale, strings: base.strings)
    }
    return WatchMeta(theme: "dark", locale: "ru", strings: .fallback(for: "ru"))
  }

  // MARK: - Staleness / API refresh

  /// True when the displayed snapshot is old enough to try the API: no data for
  /// today, or generated more than 2 days ago.
  var isStale: Bool {
    guard let snap = snapshot else { return selection != nil }
    let df = DateFormatter()
    df.calendar = Calendar(identifier: .gregorian)
    df.locale = Locale(identifier: "en_US_POSIX")
    df.dateFormat = "yyyy-MM-dd"
    let todayISO = df.string(from: Date())
    let hasToday = snap.days.contains { $0.dateISO == todayISO }
    if !hasToday { return true }
    if let generated = snap.generatedAtDate {
      return Date().timeIntervalSince(generated) > 2 * 24 * 60 * 60
    }
    return false
  }

  /// Refresh from the BSUIR API when the current data is stale. Refreshes the
  /// active override if one is set, otherwise the pinned group as a fallback for
  /// when the phone is unreachable.
  func refreshFromAPIIfNeeded() {
    guard isStale, !isRefreshing else { return }
    if let sel = selection {
      fetchOverride(sel)
    } else if let base = phoneSnapshot {
      refreshPinned(base: base)
    }
  }

  private func refreshPinned(base: WatchSnapshot) {
    isRefreshing = true
    fetchFailed = false
    let group = base.groupName
    let meta = WatchMeta(theme: base.theme, locale: base.locale, strings: base.strings)
    Task {
      let result = await BsuirAPI.fetchGroupWindow(group: group, displayName: group, meta: meta)
      await MainActor.run {
        guard self.selection == nil else { return }
        self.isRefreshing = false
        if let result = result {
          self.phoneSnapshot = result
          if let json = self.encode(result) { self.defaults?.set(json, forKey: self.phoneKey) }
          self.snapshot = result
        } else {
          self.fetchFailed = true
        }
      }
    }
  }

  /// The locale to drive watch-only UI strings (defaults to ru).
  var locale: String { snapshot?.locale ?? phoneSnapshot?.locale ?? "ru" }

  // MARK: - WatchConnectivity

  private func activateSession() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    // The phone may have set an application context before we activated.
    let context = session.receivedApplicationContext
    if let json = context["snapshot"] as? String {
      ingest(json: json)
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any])
  {
    if let json = applicationContext["snapshot"] as? String {
      ingest(json: json)
    }
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    if let json = userInfo["snapshot"] as? String {
      ingest(json: json)
    }
  }
}
