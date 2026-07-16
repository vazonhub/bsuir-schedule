// LessonSupport.swift
//
// Pure presentation logic for the watch UI: local time-of-day computation
// (so "now / next" stays correct even if the snapshot was built hours ago),
// per-lesson phase, hero selection, date labels, and hex color parsing.

import SwiftUI

// MARK: - Time

/// Minutes since local midnight for the given instant.
func nowMinutes(_ date: Date = Date()) -> Int {
  let c = Calendar.current.dateComponents([.hour, .minute], from: date)
  return (c.hour ?? 0) * 60 + (c.minute ?? 0)
}

/// Parse an "HH:mm" string into minutes since midnight.
func parseMinutes(_ hhmm: String) -> Int? {
  let parts = hhmm.split(separator: ":")
  guard parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]) else { return nil }
  return h * 60 + m
}

enum LessonPhase {
  case past, ongoing, upcoming
}

func phase(_ lesson: WidgetLesson, now: Int) -> LessonPhase {
  guard let start = parseMinutes(lesson.startTime), let end = parseMinutes(lesson.endTime) else {
    return .upcoming
  }
  if now >= end { return .past }
  if now >= start { return .ongoing }
  return .upcoming
}

// MARK: - Hero (now / next)

struct HeroSelection {
  let lesson: WidgetLesson
  /// true = happening right now; false = the next upcoming lesson.
  let isNow: Bool
  /// true when the next lesson is on `nextDay` rather than today.
  let isTomorrow: Bool
}

/// Pick the lesson to feature at the top: an ongoing one, else the next one
/// today, else the first lesson of the next day. `nil` = nothing left.
func heroSelection(_ snapshot: WidgetSnapshot, now: Int) -> HeroSelection? {
  let today = snapshot.today.lessons.filter { $0.isMine }
  if let ongoing = today.first(where: { phase($0, now: now) == .ongoing }) {
    return HeroSelection(lesson: ongoing, isNow: true, isTomorrow: false)
  }
  if let next = today.first(where: { phase($0, now: now) == .upcoming }) {
    return HeroSelection(lesson: next, isNow: false, isTomorrow: false)
  }
  if let next = snapshot.nextDay?.lessons.first(where: { $0.isMine }) {
    return HeroSelection(lesson: next, isNow: false, isTomorrow: true)
  }
  return nil
}

/// Lessons for the given day that belong to the user (subgroup filter).
func myLessons(_ day: WidgetDayBlock) -> [WidgetLesson] {
  day.lessons.filter { $0.isMine }
}

// MARK: - Labels

/// "17 июля" style label from the snapshot's localized month names.
func dayLabel(_ day: WidgetDayBlock, _ strings: WidgetStrings?) -> String {
  if let months = strings?.months, day.month >= 0, day.month < months.count {
    return "\(day.dayOfMonth) \(months[day.month])"
  }
  return "\(day.dayOfMonth)"
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
