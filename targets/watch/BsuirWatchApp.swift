import SwiftUI
import WatchKit

@main
struct BsuirWatchApp: App {
  @WKApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
  @StateObject private var store = WatchStore.shared

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(store)
    }
  }
}

final class AppDelegate: NSObject, WKApplicationDelegate {
  func applicationDidFinishLaunching() {
    // Warm up the store → activates WCSession and loads the cached snapshot.
    _ = WatchStore.shared
  }

  func applicationDidBecomeActive() {
    // Try to refresh from the API if the cached data is missing/stale.
    WatchStore.shared.refreshFromAPIIfNeeded()
  }
}
