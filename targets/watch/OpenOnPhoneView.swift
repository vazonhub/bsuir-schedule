import SwiftUI

/// Shown when there is no snapshot yet (watch never received data from the
/// phone and cannot fetch on its own — the pinned group is unknown).
struct OpenOnPhoneView: View {
  let locale: String
  /// Opens the group/teacher picker so the watch can be used standalone.
  var onChoose: (() -> Void)?

  var body: some View {
    let s = L10n.strings(for: locale)
    return ScrollView {
      VStack(spacing: 10) {
        Image(systemName: "iphone.and.arrow.forward")
          .font(.title2)
          .foregroundStyle(.blue)
        Text(s.openOnPhoneTitle)
          .font(.headline)
          .multilineTextAlignment(.center)
        Text(s.openOnPhoneSubtitle)
          .font(.caption2)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
        if let onChoose {
          Button {
            onChoose()
          } label: {
            Label(s.chooseButton, systemImage: "magnifyingglass")
          }
          .padding(.top, 4)
        }
      }
      .frame(maxWidth: .infinity)
      .padding()
    }
  }
}
