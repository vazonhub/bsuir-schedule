// BsuirWatchApp.swift
//
// Entry point of the watchOS companion app for "Bsuir Time".
// Phase 0: minimal shell that renders a placeholder screen so the target
// builds and launches in the watchOS simulator. Data plumbing (iCloud KV
// transport) and the real schedule UI arrive in Phase 1/2 — see WATCH_PLAN.md.

import SwiftUI

@main
struct BsuirWatchApp: App {
  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }
}
