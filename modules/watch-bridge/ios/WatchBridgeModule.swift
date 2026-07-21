import ExpoModulesCore
import WatchConnectivity

/// Long-lived WCSession owner. The Expo `Module` instance is not a good place
/// to hold the delegate (its lifetime is tied to the JS bridge), so session
/// activation and delivery live in this singleton.
final class WatchSessionManager: NSObject, WCSessionDelegate {
  static let shared = WatchSessionManager()

  private override init() {
    super.init()
  }

  /// Activate the default session once. Safe to call repeatedly.
  func activate() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    if session.delegate == nil {
      session.delegate = self
    }
    if session.activationState != .activated {
      session.activate()
    }
  }

  var isPaired: Bool {
    guard WCSession.isSupported() else { return false }
    return WCSession.default.isPaired
  }

  var isWatchAppInstalled: Bool {
    guard WCSession.isSupported() else { return false }
    return WCSession.default.isWatchAppInstalled
  }

  /// Push the latest snapshot. Prefers `updateApplicationContext`
  /// (latest-state-wins); on failure falls back to a queued `transferUserInfo`
  /// so the payload is still delivered when the watch becomes reachable.
  @discardableResult
  func update(json: String) -> Bool {
    guard WCSession.isSupported() else { return false }
    let session = WCSession.default
    if session.activationState != .activated {
      session.activate()
    }
    let payload: [String: Any] = [
      "snapshot": json,
      "ts": Date().timeIntervalSince1970,
    ]
    do {
      try session.updateApplicationContext(payload)
      return true
    } catch {
      session.transferUserInfo(payload)
      return true
    }
  }

  // MARK: - WCSessionDelegate (iOS-required methods)

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {}

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    // Re-activate so a newly switched watch keeps receiving updates.
    session.activate()
  }
}

public class WatchBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WatchBridge")

    OnCreate {
      WatchSessionManager.shared.activate()
    }

    Function("isSupported") { () -> Bool in
      WCSession.isSupported()
    }

    Function("isPaired") { () -> Bool in
      WatchSessionManager.shared.isPaired
    }

    Function("isWatchAppInstalled") { () -> Bool in
      WatchSessionManager.shared.isWatchAppInstalled
    }

    Function("updateContext") { (json: String) -> Bool in
      WatchSessionManager.shared.update(json: json)
    }
  }
}
