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

// MARK: - Stale-date resolution

/// Local "yyyy-MM-dd" for the given instant, matching the format the phone
/// writes into WidgetDayBlock.dateISO (local, hand-built — not UTC).
func currentDateISO(_ date: Date = Date()) -> String {
  let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
  return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
}

/// Reconcile the snapshot's day blocks with the watch's real current date.
/// The snapshot may be stale (built hours ago), so after midnight its `today`
/// can actually be yesterday and `nextDay` the real today. Returns the blocks
/// that genuinely correspond to today / the following day, or nil when the
/// snapshot is too old to describe today.
func resolvedDays(_ snapshot: WidgetSnapshot, todayISO: String) -> (today: WidgetDayBlock?, next: WidgetDayBlock?) {
  if snapshot.today.dateISO == todayISO {
    return (snapshot.today, snapshot.nextDay)
  }
  if let next = snapshot.nextDay, next.dateISO == todayISO {
    return (next, nil)
  }
  return (nil, nil)
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
/// Uses `date` for both the wall-clock (now/next) and the stale-date guard.
func heroSelection(_ snapshot: WidgetSnapshot, at date: Date = Date()) -> HeroSelection? {
  let now = nowMinutes(date)
  let (today, next) = resolvedDays(snapshot, todayISO: currentDateISO(date))
  let todayLessons = today.map(myLessons) ?? []

  if let ongoing = todayLessons.first(where: { phase($0, now: now) == .ongoing }) {
    return HeroSelection(lesson: ongoing, isNow: true, isTomorrow: false)
  }
  if let upcoming = todayLessons.first(where: { phase($0, now: now) == .upcoming }) {
    return HeroSelection(lesson: upcoming, isNow: false, isTomorrow: false)
  }
  if let next, let first = myLessons(next).first {
    return HeroSelection(lesson: first, isNow: false, isTomorrow: true)
  }
  return nil
}

/// Lessons for the given day that belong to the user (subgroup filter).
func myLessons(_ day: WidgetDayBlock) -> [WidgetLesson] {
  day.lessons.filter { $0.isMine }
}

// MARK: - Labels

/// "17 июля" style label from the snapshot's localized month names.
/// `day.month` is 0-based (JS month), matching the `months` array order.
func dayLabel(_ day: WidgetDayBlock, _ strings: WidgetStrings?) -> String {
  if let months = strings?.months, day.month >= 0, day.month < months.count {
    return "\(day.dayOfMonth) \(months[day.month])"
  }
  return "\(day.dayOfMonth)"
}

/// Same label built from a `Date` (used when the snapshot has no block for the
/// real today). `Calendar` month is 1-based, so shift to the 0-based array.
func dayLabel(_ date: Date, _ strings: WidgetStrings?) -> String {
  let c = Calendar.current.dateComponents([.day, .month], from: date)
  let monthIndex = (c.month ?? 1) - 1
  if let months = strings?.months, monthIndex >= 0, monthIndex < months.count {
    return "\(c.day ?? 0) \(months[monthIndex])"
  }
  return "\(c.day ?? 0)"
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
