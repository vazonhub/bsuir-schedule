import Foundation
import WidgetKit

/// Exposes WidgetKit timeline reload to React Native via NativeModules.
@objc(WidgetKitBridge)
final class WidgetKitBridge: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { false }

  @objc
  func reloadAllTimelines() {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}
