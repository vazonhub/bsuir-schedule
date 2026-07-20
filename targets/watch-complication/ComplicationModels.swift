import Foundation

// MARK: - Minimal decode of the cached WatchSnapshot
//
// Mirrors the subset of `targets/watch/Models.swift` the complication needs.
// Unknown JSON keys are ignored by Codable, so this stays in sync with the full
// snapshot as long as these field names and the `version: 1` contract hold.

struct CxLesson: Codable {
  let subject: String
  let typeAbbrev: String?
  let typeColorHex: String
  let startTime: String
  let endTime: String
  let auditories: [String]
  let numSubgroup: Int
  let isMine: Bool
}

struct CxDay: Codable {
  let dateISO: String
  let lessons: [CxLesson]
}

struct CxStrings: Codable {
  let noClasses: String
  let today: String
  let tomorrow: String
}

struct CxSnapshot: Codable {
  let groupName: String
  let locale: String
  let strings: CxStrings
  let days: [CxDay]
}

/// The value a single complication entry renders.
struct NextLessonInfo {
  let groupName: String
  let lesson: CxLesson?
  /// Non-nil when the next lesson isn't today (e.g. "завтра", "пн 25.08").
  let dayLabel: String?
  let noClassesText: String
}

// MARK: - Store (App Group cache reader)

/// Reads the same App-Group snapshot the watch app renders and derives the
/// "next lesson" for the complication. Selection-aware: prefers the manual
/// override (if the user picked another group/teacher) over the phone snapshot.
enum ComplicationStore {
  private static let appGroup = "group.by.vazon.bsuirschedule"
  private static let phoneKey = "watchSnapshot"
  private static let overrideKey = "watchOverrideSnapshot"
  private static let selectionKey = "watchSelection"

  static func load() -> CxSnapshot? {
    let defaults = UserDefaults(suiteName: appGroup)
    // Mirror WatchStore.displayed: override wins when a selection is active.
    if defaults?.data(forKey: selectionKey) != nil,
      let raw = defaults?.string(forKey: overrideKey),
      let snap = decode(raw)
    {
      return snap
    }
    if let raw = defaults?.string(forKey: phoneKey) { return decode(raw) }
    return nil
  }

  private static func decode(_ json: String) -> CxSnapshot? {
    guard let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(CxSnapshot.self, from: data)
  }

  /// The lesson to surface at `now`: the first of the user's lessons today that
  /// hasn't finished yet; otherwise the first lesson on the next day that has
  /// any. Returns `nil` lesson when the window has no upcoming lessons.
  static func info(now: Date) -> NextLessonInfo {
    guard let snap = load() else {
      return NextLessonInfo(groupName: "", lesson: nil, dayLabel: nil, noClassesText: "—")
    }
    let nowISO = isoDay(now)
    let nowHHmm = hhmm(now)

    // Upcoming lesson today (still running or later).
    if let today = snap.days.first(where: { $0.dateISO == nowISO }) {
      if let lesson = today.lessons.first(where: { $0.isMine && $0.endTime > nowHHmm }) {
        return NextLessonInfo(
          groupName: snap.groupName, lesson: lesson, dayLabel: nil,
          noClassesText: snap.strings.noClasses)
      }
    }

    // Otherwise the next day (after today) that has lessons.
    let future = snap.days
      .filter { $0.dateISO > nowISO && $0.lessons.contains { $0.isMine } }
      .sorted { $0.dateISO < $1.dateISO }
    if let day = future.first, let lesson = day.lessons.first(where: { $0.isMine }) {
      return NextLessonInfo(
        groupName: snap.groupName, lesson: lesson,
        dayLabel: dayLabel(for: day.dateISO, now: now, strings: snap.strings),
        noClassesText: snap.strings.noClasses)
    }

    return NextLessonInfo(
      groupName: snap.groupName, lesson: nil, dayLabel: nil,
      noClassesText: snap.strings.noClasses)
  }

  /// Timeline refresh points: `now` plus each remaining lesson boundary today,
  /// so the "current/next" advances automatically as lessons pass.
  static func boundaries(now: Date) -> [Date] {
    var dates: [Date] = [now]
    guard let snap = load() else { return dates }
    let nowISO = isoDay(now)
    guard let today = snap.days.first(where: { $0.dateISO == nowISO }) else { return dates }
    for lesson in today.lessons where lesson.isMine {
      for time in [lesson.startTime, lesson.endTime] {
        if let d = dateToday(time, now: now), d > now { dates.append(d) }
      }
    }
    return Array(Set(dates)).sorted()
  }

  // MARK: Helpers

  private static func dayLabel(for iso: String, now: Date, strings: CxStrings) -> String? {
    let tomorrow = isoDay(now.addingTimeInterval(24 * 60 * 60))
    if iso == tomorrow { return strings.tomorrow }
    // "dd.MM" from the ISO date.
    let parts = iso.split(separator: "-")
    if parts.count == 3 { return "\(parts[2]).\(parts[1])" }
    return iso
  }

  private static func isoDay(_ date: Date) -> String {
    let df = DateFormatter()
    df.calendar = Calendar(identifier: .gregorian)
    df.locale = Locale(identifier: "en_US_POSIX")
    df.dateFormat = "yyyy-MM-dd"
    return df.string(from: date)
  }

  private static func hhmm(_ date: Date) -> String {
    let df = DateFormatter()
    df.calendar = Calendar(identifier: .gregorian)
    df.locale = Locale(identifier: "en_US_POSIX")
    df.dateFormat = "HH:mm"
    return df.string(from: date)
  }

  /// Combine today's y/m/d with an "HH:mm" string into a Date.
  private static func dateToday(_ time: String, now: Date) -> Date? {
    let parts = time.split(separator: ":")
    guard parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]) else { return nil }
    let cal = Calendar(identifier: .gregorian)
    return cal.date(bySettingHour: h, minute: m, second: 0, of: now)
  }
}
