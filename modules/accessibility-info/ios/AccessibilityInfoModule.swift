import ExpoModulesCore
import UIKit

public class AccessibilityInfoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AccessibilityExtras")

    Function("shouldDifferentiateWithoutColor") {
      return UIAccessibility.shouldDifferentiateWithoutColor
    }

    Events("onDifferentiateWithoutColorChanged")

    OnStartObserving {
      NotificationCenter.default.addObserver(
        self,
        selector: #selector(self.didChange),
        name: UIAccessibility.differentiateWithoutColorDidChangeNotification,
        object: nil
      )
    }

    OnStopObserving {
      NotificationCenter.default.removeObserver(
        self,
        name: UIAccessibility.differentiateWithoutColorDidChangeNotification,
        object: nil
      )
    }
  }

  @objc private func didChange() {
    sendEvent("onDifferentiateWithoutColorChanged", [
      "enabled": UIAccessibility.shouldDifferentiateWithoutColor
    ])
  }
}
