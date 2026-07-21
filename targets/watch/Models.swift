import Foundation

// MARK: - Data models (mirror TS `WatchSnapshot` from src/services/watch/watchData.ts)

struct WatchLesson: Codable, Identifiable, Hashable {
  let id: String
  let subject: String
  let typeAbbrev: String?
  let typeColorHex: String
  let startTime: String
  let endTime: String
  let auditories: [String]
  let teacher: String?
  /// 0 = shared, 1 | 2 = a specific subgroup.
  let numSubgroup: Int
  /// True if the lesson belongs to the user's selected subgroup (or is shared).
  let isMine: Bool
  let note: String?
}

struct WatchDayBlock: Codable, Identifiable, Hashable {
  let dateISO: String
  /// 0..6 (matches JS Date.getDay(); 0 = Sunday).
  let dayOfWeek: Int
  let dayOfMonth: Int
  /// 0..11.
  let month: Int
  /// 1..4 cycle week.
  let weekNumber: Int
  let lessons: [WatchLesson]
  let holidayName: String?

  var id: String { dateISO }
}

struct WatchStrings: Codable, Hashable {
  let daysShort: [String]
  let daysLong: [String]
  let months: [String]
  let weekLabel: String
  let noClasses: String
  let today: String
  let tomorrow: String
  let subgroupShort: String

  /// Built-in strings, keyed by snapshot `locale`, mirroring the phone i18n
  /// (`src/i18n/*`). Used when the watch builds a snapshot for a manually
  /// selected group/teacher and no phone snapshot is available to borrow from.
  static func fallback(for locale: String) -> WatchStrings {
    switch locale {
    case "en":
      return WatchStrings(
        daysShort: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
        daysLong: [
          "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
        ],
        months: [
          "January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December",
        ],
        weekLabel: "Week", noClasses: "No classes", today: "Today", tomorrow: "Tomorrow",
        subgroupShort: "sub")
    case "be":
      return WatchStrings(
        daysShort: ["НД", "ПН", "АЎ", "СР", "ЧЦ", "ПТ", "СБ"],
        daysLong: [
          "Нядзеля", "Панядзелак", "Аўторак", "Серада", "Чацвер", "Пятніца", "Субота",
        ],
        months: [
          "студзеня", "лютага", "сакавіка", "красавіка", "мая", "чэрвеня", "ліпеня",
          "жніўня", "верасня", "кастрычніка", "лістапада", "снежня",
        ],
        weekLabel: "Тыдзень", noClasses: "Няма заняткаў", today: "Сёння", tomorrow: "Заўтра",
        subgroupShort: "п/г")
    default:  // ru
      return WatchStrings(
        daysShort: ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"],
        daysLong: [
          "Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота",
        ],
        months: [
          "января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа",
          "сентября", "октября", "ноября", "декабря",
        ],
        weekLabel: "Неделя", noClasses: "Нет пар", today: "Сегодня", tomorrow: "Завтра",
        subgroupShort: "п/г")
    }
  }
}

/// A manual override chosen on the watch itself (group or teacher), replacing
/// the phone-pushed pinned group until cleared. Persisted in App-Group defaults.
struct WatchSelection: Codable, Hashable, Identifiable {
  enum Kind: String, Codable { case group, employee }

  let kind: Kind
  /// Group name (for `.group`) or employee `urlId` (for `.employee`) — the value
  /// used to fetch the schedule.
  let value: String
  /// Human-readable label for the header (group name or short FIO).
  let displayName: String

  var id: String { "\(kind.rawValue):\(value)" }
}

struct WatchSnapshot: Codable, Hashable {
  let version: Int
  let groupName: String
  let generatedAt: String
  let currentWeek: Int
  /// "light" | "dark".
  let theme: String
  /// 0 = all, 1 | 2 = a specific subgroup.
  let subgroup: Int
  /// "ru" | "en" | "be".
  let locale: String
  let strings: WatchStrings
  /// Every day in the window [today .. today + 28), empty days included.
  let days: [WatchDayBlock]
}

// MARK: - Helpers

extension WatchSnapshot {
  /// Parse `generatedAt` (JS `Date.toISOString()`, with fractional seconds).
  var generatedAtDate: Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = formatter.date(from: generatedAt) { return date }
    // Fallback without fractional seconds.
    formatter.formatOptions = [.withInternetDateTime]
    return formatter.date(from: generatedAt)
  }

  /// Index of today's block (dateISO == today in local time), or 0.
  func todayIndex(now: Date = Date()) -> Int {
    let df = DateFormatter()
    df.calendar = Calendar(identifier: .gregorian)
    df.locale = Locale(identifier: "en_US_POSIX")
    df.dateFormat = "yyyy-MM-dd"
    let todayISO = df.string(from: now)
    return days.firstIndex(where: { $0.dateISO == todayISO }) ?? 0
  }
}

extension WatchDayBlock {
  /// Lessons that belong to the user's selected subgroup (shared always shown).
  var visibleLessons: [WatchLesson] {
    lessons.filter { $0.isMine }
  }
}
