import Combine
import Foundation
import WatchConnectivity

/// Single source of truth for the watch UI.
///
/// Primary data path: the phone pushes a `WatchSnapshot` JSON via
/// `WCSession` (application context / user info). We persist the raw JSON to
/// App-Group `UserDefaults` and republish the decoded value. On launch we read
/// the last persisted snapshot so the UI shows instantly, offline.
///
/// The API fallback (`refreshFromAPIIfNeeded`) lives in `API.swift`.
final class WatchStore: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = WatchStore()

  @Published private(set) var snapshot: WatchSnapshot?
  @Published var isRefreshing = false
  @Published var fetchFailed = false

  let appGroup = "group.by.vazon.bsuirschedule"
  private let snapshotKey = "watchSnapshot"

  private override init() {
    super.init()
    loadFromDisk()
    activateSession()
  }

  private var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

  // MARK: - Persistence

  private func loadFromDisk() {
    guard let raw = defaults?.string(forKey: snapshotKey) else { return }
    snapshot = decode(raw)
  }

  private func decode(_ json: String) -> WatchSnapshot? {
    guard let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WatchSnapshot.self, from: data)
  }

  /// Persist raw JSON and republish on the main thread.
  func ingest(json: String) {
    guard let decoded = decode(json) else { return }
    defaults?.set(json, forKey: snapshotKey)
    DispatchQueue.main.async {
      self.snapshot = decoded
      self.fetchFailed = false
    }
  }

  /// Replace the in-memory snapshot (used by the API fallback in API.swift).
  func setSnapshot(_ next: WatchSnapshot) {
    if let data = try? JSONEncoder().encode(next),
      let json = String(data: data, encoding: .utf8)
    {
      defaults?.set(json, forKey: snapshotKey)
    }
    snapshot = next
  }

  // MARK: - Staleness

  /// True when the snapshot is old enough that we should try the API fallback:
  /// no data for today, or generated more than 2 days ago.
  var isStale: Bool {
    guard let snap = snapshot else { return false }
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

  /// The locale to drive watch-only UI strings (defaults to ru).
  var locale: String { snapshot?.locale ?? "ru" }

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

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
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
