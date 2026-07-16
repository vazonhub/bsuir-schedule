// SnapshotStore.swift
//
// Phase 1 transport: reads the WidgetSnapshot delivered from the phone via
// iCloud key-value store (NSUbiquitousKeyValueStore). App Groups do NOT sync
// across devices, so iCloud KV is how the phone → watch handoff happens:
//   phone  -> ICloudKV.setItem("widgetSnapshot", json)   (expo-icloud-kv)
//   watch  -> NSUbiquitousKeyValueStore.string(forKey:)  (here)
//
// The latest JSON is also mirrored into the watch's own App Group UserDefaults
// so it survives relaunches and can be read by the watch widget extension
// (complications) added in Phase 3.

import Combine
import Foundation
import WidgetKit

final class SnapshotStore: ObservableObject {
  @Published private(set) var snapshot: WidgetSnapshot?

  static let storageKey = "widgetSnapshot"
  static let appGroup = "group.by.vazon.bsuirschedule"

  private let kvStore = NSUbiquitousKeyValueStore.default
  private var appGroupDefaults: UserDefaults? { UserDefaults(suiteName: Self.appGroup) }

  init() {
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(externalChange(_:)),
      name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
      object: kvStore
    )
    load()
    // Pull whatever iCloud already has cached for this device.
    kvStore.synchronize()
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  /// Re-read after the phone pushes a new snapshot (or on initial iCloud sync).
  @objc private func externalChange(_ note: Notification) {
    load()
  }

  private func load() {
    // Prefer the freshly-synced iCloud value; persist it locally as we go.
    // Fall back to the last locally-cached copy when iCloud has nothing yet.
    let json: String?
    if let fromCloud = kvStore.string(forKey: Self.storageKey) {
      json = fromCloud
      appGroupDefaults?.set(fromCloud, forKey: Self.storageKey)
    } else {
      json = appGroupDefaults?.string(forKey: Self.storageKey)
    }

    guard let json, let decoded = decode(json) else { return }

    DispatchQueue.main.async {
      self.snapshot = decoded
      // Refresh complications once the watch widget extension exists (Phase 3);
      // harmless no-op until then.
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  private func decode(_ json: String) -> WidgetSnapshot? {
    guard let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
  }
}
