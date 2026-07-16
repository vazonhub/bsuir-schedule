// ContentView.swift
//
// Phase 1: minimal render proving the iCloud KV transport works end-to-end —
// group header + today's lessons. Phase 2 replaces this with the polished
// Now / Today / Tomorrow screens.

import SwiftUI

struct ContentView: View {
  @EnvironmentObject private var store: SnapshotStore

  var body: some View {
    if let snapshot = store.snapshot {
      ScheduleList(snapshot: snapshot)
    } else {
      EmptyState()
    }
  }
}

private struct ScheduleList: View {
  let snapshot: WidgetSnapshot

  var body: some View {
    List {
      Section {
        ForEach(Array(snapshot.today.lessons.enumerated()), id: \.offset) { _, lesson in
          LessonRow(lesson: lesson)
        }
        if snapshot.today.lessons.isEmpty {
          Text(snapshot.strings?.noClasses ?? "Пар нет")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
      } header: {
        Text(header)
      }
    }
    .navigationTitle(snapshot.groupName)
  }

  private var header: String {
    let week = snapshot.strings?.weekLabel ?? "Неделя"
    return "\(week) \(snapshot.currentWeek)"
  }
}

private struct LessonRow: View {
  let lesson: WidgetLesson

  var body: some View {
    HStack(spacing: 8) {
      RoundedRectangle(cornerRadius: 2)
        .fill(Color(hex: lesson.typeColorHex) ?? .gray)
        .frame(width: 4)
      VStack(alignment: .leading, spacing: 2) {
        Text(lesson.subject)
          .font(.headline)
          .lineLimit(1)
        Text("\(lesson.startTime)–\(lesson.endTime)")
          .font(.caption2)
          .foregroundStyle(.secondary)
        if !lesson.auditories.isEmpty {
          Text(lesson.auditories.joined(separator: ", "))
            .font(.caption2)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
      }
      Spacer(minLength: 0)
    }
    .padding(.vertical, 2)
  }
}

private struct EmptyState: View {
  var body: some View {
    VStack(spacing: 6) {
      Image(systemName: "calendar")
        .font(.system(size: 28, weight: .semibold))
        .foregroundStyle(.tint)
      Text("Bsuir Time")
        .font(.headline)
      Text("Откройте приложение на iPhone,\nчтобы синхронизировать расписание")
        .font(.caption2)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
    }
    .padding()
  }
}

// MARK: - Hex color

extension Color {
  /// Parse a `#RRGGBB` / `#RRGGBBAA` hex string (as produced by typeColorHex).
  init?(hex: String) {
    var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.hasPrefix("#") { s.removeFirst() }
    guard let value = UInt64(s, radix: 16) else { return nil }

    let r, g, b, a: Double
    switch s.count {
    case 6:
      r = Double((value & 0xFF0000) >> 16) / 255
      g = Double((value & 0x00FF00) >> 8) / 255
      b = Double(value & 0x0000FF) / 255
      a = 1
    case 8:
      r = Double((value & 0xFF00_0000) >> 24) / 255
      g = Double((value & 0x00FF_0000) >> 16) / 255
      b = Double((value & 0x0000_FF00) >> 8) / 255
      a = Double(value & 0x0000_00FF) / 255
    default:
      return nil
    }
    self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
  }
}
