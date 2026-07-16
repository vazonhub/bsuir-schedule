// BsuirWatchApp.swift
//
// Entry point of the watchOS companion app for "Bsuir Time".
// Owns the SnapshotStore (iCloud KV transport) and injects it into the view tree.

import SwiftUI

@main
struct BsuirWatchApp: App {
  @StateObject private var store = SnapshotStore()

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(store)
    }
  }
}
