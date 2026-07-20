import Foundation

// MARK: - Minimal API DTOs (only the fields the fallback needs)

private struct APIEmployee: Decodable {
  let firstName: String?
  let middleName: String?
  let lastName: String?
  let fio: String?
}

private struct APILesson: Decodable {
  let subject: String?
  let startLessonTime: String?
  let endLessonTime: String?
  let auditories: [String]?
  let lessonTypeAbbrev: String?
  let numSubgroup: Int?
  let weekNumber: [Int]?
  let startLessonDate: String?
  let endLessonDate: String?
  let dateLesson: String?
  let note: String?
  let employees: [APIEmployee]?
}

private struct APISchedule: Decodable {
  let startDate: String?
  let endDate: String?
  let schedules: [String: [APILesson]]?
}

/// Simplified schedule fetcher used only when the cached snapshot is stale and
/// the phone isn't reachable.
///
/// Deliberately degraded vs. the phone path: it expands regular periodic
/// lessons across the 4-week cycle (respecting `weekNumber` and subgroup) but
/// does NOT handle exams, holidays, blocked lessons, or per-lesson accent
/// overrides. Metadata (group, subgroup, theme, locale, localized strings) is
/// reused from the existing cached snapshot.
enum BsuirAPI {
  private static let base = "https://iis.bsuir.by/api/v1"
  private static let windowDays = 28

  private static let lessonTypeColors: [String: String] = [
    "ПЗ": "#8E5CD9",
    "ЛР": "#F08A24",
    "ЛК": "#3FB36F",
    "Консультация": "#32ADE6",
    "Экзамен": "#FF3B30",
    "УПз": "#8E5CD9",
    "УЛк": "#3FB36F",
  ]
  private static let fallbackColor = "#9A9A9E"

  /// Russian day-of-week key → JS getDay() index (0 = Sunday).
  private static let dayNameToDow: [String: Int] = [
    "Воскресенье": 0,
    "Понедельник": 1,
    "Вторник": 2,
    "Среда": 3,
    "Четверг": 4,
    "Пятница": 5,
    "Суббота": 6,
  ]

  // MARK: Public entry

  /// Fetch and rebuild the `days` window for `group`, reusing the metadata and
  /// localized strings from `base`. Returns nil on any failure.
  static func fetchWindow(group: String, base: WatchSnapshot) async -> WatchSnapshot? {
    guard
      let week = try? await fetchCurrentWeek(),
      let schedule = try? await fetchSchedule(group: group)
    else { return nil }

    let days = buildDays(schedule: schedule, currentWeek: week, subgroup: base.subgroup)

    let iso = ISO8601DateFormatter()
    iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    return WatchSnapshot(
      version: base.version,
      groupName: base.groupName,
      generatedAt: iso.string(from: Date()),
      currentWeek: week,
      theme: base.theme,
      subgroup: base.subgroup,
      locale: base.locale,
      strings: base.strings,
      days: days
    )
  }

  // MARK: Networking

  private static func fetchCurrentWeek() async throws -> Int {
    guard let url = URL(string: "\(base)/schedule/current-week") else {
      throw URLError(.badURL)
    }
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(Int.self, from: data)
  }

  private static func fetchSchedule(group: String) async throws -> APISchedule {
    var components = URLComponents(string: "\(base)/schedule")
    components?.queryItems = [URLQueryItem(name: "studentGroup", value: group)]
    guard let url = components?.url else { throw URLError(.badURL) }
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(APISchedule.self, from: data)
  }

  // MARK: Normalization (simplified port of flattenSchedule)

  private static func buildDays(schedule: APISchedule, currentWeek: Int, subgroup: Int)
    -> [WatchDayBlock]
  {
    let calendar = Calendar(identifier: .gregorian)
    let today = calendar.startOfDay(for: Date())
    let start = schedule.startDate.flatMap(parseBsuir)
    let end = schedule.endDate.flatMap(parseBsuir)

    var days: [WatchDayBlock] = []
    for offset in 0..<windowDays {
      guard let date = calendar.date(byAdding: .day, value: offset, to: today) else { continue }
      let dow = calendar.component(.weekday, from: date) - 1  // 1=Sun → 0
      let week = computeWeek(for: date, today: today, currentWeek: currentWeek)

      let dayName = dayNameToDow.first(where: { $0.value == dow })?.key
      let dayLessons = dayName.flatMap { schedule.schedules?[$0] } ?? []

      var lessons: [WatchLesson] = []
      for lesson in dayLessons {
        if !occurrenceMatches(
          lesson, date: date, week: week, scheduleStart: start, scheduleEnd: end)
        {
          continue
        }
        lessons.append(toWatchLesson(lesson, date: date, subgroup: subgroup))
      }
      lessons.sort { ($0.startTime) < ($1.startTime) }

      let comps = calendar.dateComponents([.day, .month], from: date)
      days.append(
        WatchDayBlock(
          dateISO: isoDay(date),
          dayOfWeek: dow,
          dayOfMonth: comps.day ?? 0,
          month: (comps.month ?? 1) - 1,
          weekNumber: week,
          lessons: lessons,
          holidayName: nil
        ))
    }
    return days
  }

  private static func occurrenceMatches(
    _ lesson: APILesson, date: Date, week: Int, scheduleStart: Date?, scheduleEnd: Date?
  ) -> Bool {
    // One-off dated announcement.
    if let dateLesson = lesson.dateLesson, let d = parseBsuir(dateLesson) {
      return Calendar(identifier: .gregorian).isDate(d, inSameDayAs: date)
    }
    // Periodic: respect the lesson's own date range and week list.
    let lessonStart = lesson.startLessonDate.flatMap(parseBsuir) ?? scheduleStart
    let lessonEnd = lesson.endLessonDate.flatMap(parseBsuir) ?? scheduleEnd
    if let s = lessonStart, date < s { return false }
    if let e = lessonEnd, date > e { return false }
    let weeks = lesson.weekNumber ?? []
    return weeks.isEmpty || weeks.contains(week)
  }

  private static func toWatchLesson(_ lesson: APILesson, date: Date, subgroup: Int) -> WatchLesson {
    let numSub = lesson.numSubgroup ?? 0
    let isMine = subgroup == 0 || numSub == 0 || numSub == subgroup
    let color = lesson.lessonTypeAbbrev.flatMap { lessonTypeColors[$0] } ?? fallbackColor
    let subject = lesson.subject ?? ""
    let startTime = lesson.startLessonTime ?? ""

    return WatchLesson(
      id: "\(isoDay(date))_\(startTime)_\(subject)_\(numSub)",
      subject: subject,
      typeAbbrev: lesson.lessonTypeAbbrev,
      typeColorHex: color,
      startTime: startTime,
      endTime: lesson.endLessonTime ?? "",
      auditories: lesson.auditories ?? [],
      teacher: teacherShort(lesson.employees ?? []),
      numSubgroup: numSub,
      isMine: isMine,
      note: lesson.note
    )
  }

  private static func teacherShort(_ employees: [APIEmployee]) -> String? {
    guard !employees.isEmpty else { return nil }
    let names = employees.map { emp -> String in
      if let fio = emp.fio, !fio.isEmpty { return fio }
      let initials = [emp.firstName?.first, emp.middleName?.first]
        .compactMap { $0 }
        .map { "\($0)." }
        .joined(separator: " ")
      return "\(emp.lastName ?? "") \(initials)".trimmingCharacters(in: .whitespaces)
    }
    return names.joined(separator: ", ")
  }

  // MARK: Date helpers

  private static func parseBsuir(_ string: String) -> Date? {
    let df = DateFormatter()
    df.calendar = Calendar(identifier: .gregorian)
    df.locale = Locale(identifier: "en_US_POSIX")
    df.dateFormat = "dd.MM.yyyy"
    guard let date = df.date(from: string) else { return nil }
    return Calendar(identifier: .gregorian).startOfDay(for: date)
  }

  private static func isoDay(_ date: Date) -> String {
    let df = DateFormatter()
    df.calendar = Calendar(identifier: .gregorian)
    df.locale = Locale(identifier: "en_US_POSIX")
    df.dateFormat = "yyyy-MM-dd"
    return df.string(from: date)
  }

  /// Port of `computeWeekForDate`: 4-week-cycle index for `date` given `today`
  /// is in `currentWeek`. Uses whole-day arithmetic between Mondays.
  private static func computeWeek(for date: Date, today: Date, currentWeek: Int) -> Int {
    let todayMon = startOfMondayWeek(today)
    let dateMon = startOfMondayWeek(date)
    let calendar = Calendar(identifier: .gregorian)
    let days =
      calendar.dateComponents([.day], from: todayMon, to: dateMon).day ?? 0
    let weeksDiff = Int((Double(days) / 7.0).rounded())
    let idx = (((currentWeek - 1 + weeksDiff) % 4) + 4) % 4
    return idx + 1
  }

  private static func startOfMondayWeek(_ date: Date) -> Date {
    let calendar = Calendar(identifier: .gregorian)
    let start = calendar.startOfDay(for: date)
    let weekday = calendar.component(.weekday, from: start)  // 1=Sun..7=Sat
    let isoDow = weekday == 1 ? 7 : weekday - 1  // 1=Mon..7=Sun
    return calendar.date(byAdding: .day, value: -(isoDow - 1), to: start) ?? start
  }
}

// MARK: - Store integration

extension WatchStore {
  /// Refresh from the BSUIR API when the cached snapshot is stale and we know
  /// which group to fetch. No-op when data is fresh or no snapshot exists.
  func refreshFromAPIIfNeeded() {
    guard let base = snapshot, isStale, !isRefreshing else { return }
    isRefreshing = true
    fetchFailed = false
    let group = base.groupName
    Task {
      let result = await BsuirAPI.fetchWindow(group: group, base: base)
      await MainActor.run {
        self.isRefreshing = false
        if let result = result {
          self.setSnapshot(result)
        } else {
          self.fetchFailed = true
        }
      }
    }
  }
}
