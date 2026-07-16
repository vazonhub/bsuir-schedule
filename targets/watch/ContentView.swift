// ContentView.swift
//
// Phase 0 placeholder. Replaced in Phase 2 by the real Now / Today / Tomorrow
// schedule screens driven by the decoded WidgetSnapshot.

import SwiftUI

struct ContentView: View {
  var body: some View {
    VStack(spacing: 6) {
      Image(systemName: "calendar")
        .font(.system(size: 28, weight: .semibold))
        .foregroundStyle(.tint)
      Text("Bsuir Time")
        .font(.headline)
      Text("Расписание скоро появится")
        .font(.caption2)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
    }
    .padding()
  }
}

#Preview {
  ContentView()
}
