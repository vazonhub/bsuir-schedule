// BsuirWatchApp.swift
//
// Entry point of the watchOS companion app for "Bsuir Time".
// Owns the SnapshotStore (iCloud KV transport) and drives background refresh.

import SwiftUI
import WidgetKit

@main
struct BsuirWatchApp: App {
  @StateObject private var store = SnapshotStore()

  static let refreshTaskId = "by.vazon.bsuirschedule.watchkitapp.refresh"

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(store)
    }
    .backgroundTask(.appRefresh(Self.refreshTaskId)) {
      // Pull fresh data from iCloud, refresh complications, chain the next wake.
      SnapshotStore.syncFromCloudToLocal()
      await MainActor.run {
        WidgetCenter.shared.reloadAllTimelines()
        scheduleWatchRefresh()
      }
    }
  }
}
