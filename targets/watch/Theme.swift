import SwiftUI

extension Color {
  /// Build a Color from a "#RRGGBB" (or "RRGGBB") hex string. Falls back to gray.
  init(hex: String) {
    let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    var rgb: UInt64 = 0
    guard Scanner(string: cleaned).scanHexInt64(&rgb), cleaned.count == 6 else {
      self = .gray
      return
    }
    self.init(
      red: Double((rgb >> 16) & 0xFF) / 255,
      green: Double((rgb >> 8) & 0xFF) / 255,
      blue: Double(rgb & 0xFF) / 255
    )
  }
}
