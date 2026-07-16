// SnapshotStore.swift
//
// Phase 1 transport + Phase 4 refresh. Reads the WidgetSnapshot delivered from
// the phone via iCloud key-value store (NSUbiquitousKeyValueStore). App Groups
// do NOT sync across devices, so iCloud KV is the phone → watch handoff:
//   phone  -> ICloudKV.setItem("widgetSnapshot", json)   (expo-icloud-kv)
//   watch  -> NSUbiquitousKeyValueStore.string(forKey:)  (here)
//
// The latest JSON is mirrored into the watch's own App Group UserDefaults so it
// survives relaunches and can be read by the watch widget extension.

import Combine
import Foundation
import WatchKit
import WidgetKit

final class SnapshotStore: ObservableObject {
  @Published private(set) var snapshot: WidgetSnapshot?

  static let storageKey = "widgetSnapshot"
  static let appGroup = "group.by.vazon.bsuirschedule"

  private let kvStore = NSUbiquitousKeyValueStore.default

  init() {
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(externalChange(_:)),
      name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
      object: kvStore
    )
    reload()
    kvStore.synchronize()
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  /// Re-read after the phone pushes a new snapshot (or on initial iCloud sync).
  @objc private func externalChange(_ note: Notification) {
    reload()
  }

  /// Pull the latest snapshot (iCloud → local cache), decode and publish it.
  /// Called on init, on external iCloud change, and when the app becomes active.
  func reload() {
    guard let json = Self.syncFromCloudToLocal(), let decoded = decode(json) else { return }
    DispatchQueue.main.async {
      self.snapshot = decoded
      // Keep complications in sync with what the app shows.
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  /// Copy the newest value from iCloud KV into the watch's App Group cache and
  /// return the JSON. Safe to call off the main thread / from a background task
  /// (no UI touch). Falls back to the cached copy when iCloud has nothing yet.
  @discardableResult
  static func syncFromCloudToLocal() -> String? {
    let kv = NSUbiquitousKeyValueStore.default
    kv.synchronize()
    let defaults = UserDefaults(suiteName: appGroup)
    if let fromCloud = kv.string(forKey: storageKey) {
      defaults?.set(fromCloud, forKey: storageKey)
      return fromCloud
    }
    return defaults?.string(forKey: storageKey)
  }

  private func decode(_ json: String) -> WidgetSnapshot? {
    guard let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
  }
}

/// Schedule the next watchOS background app-refresh so the watch periodically
/// pulls fresh schedule data and reloads complications while backgrounded.
func scheduleWatchRefresh(after interval: TimeInterval = 30 * 60) {
  let date = Date().addingTimeInterval(interval)
  WKApplication.shared().scheduleBackgroundRefresh(withPreferredDate: date, userInfo: nil) { _ in }
}
