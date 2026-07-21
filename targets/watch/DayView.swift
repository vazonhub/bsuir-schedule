import SwiftUI

/// One day's schedule: header (date + cycle week) and the list of lessons.
struct DayView: View {
  let day: WatchDayBlock
  let snapshot: WatchSnapshot

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 8) {
        header

        if let holiday = day.holidayName, !holiday.isEmpty {
          Text(holiday)
            .font(.caption2)
            .foregroundStyle(.orange)
        }

        let lessons = day.visibleLessons
        if lessons.isEmpty {
          Text(snapshot.strings.noClasses)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.top, 12)
        } else {
          ForEach(lessons) { lesson in
            NavigationLink(value: lesson) {
              LessonRow(lesson: lesson, strings: snapshot.strings)
            }
            .buttonStyle(.plain)
          }
        }
      }
      .padding(.horizontal, 4)
    }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 2) {
      HStack {
        Text(snapshot.groupName)
          .font(.caption2.weight(.semibold))
        Spacer(minLength: 0)
        Text("\(snapshot.strings.weekLabel) \(day.weekNumber)")
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
      Text(title)
        .font(.headline)
    }
  }

  /// "Сегодня" / "Завтра" / "Понедельник, 21 сентября".
  private var title: String {
    let dow = safeIndex(snapshot.strings.daysLong, day.dayOfWeek)
    let month = safeIndex(snapshot.strings.months, day.month)
    let dayNamePart = dow.map { "\($0), " } ?? ""
    let monthPart = month.map { " \($0)" } ?? ""
    switch relationToToday {
    case .today: return snapshot.strings.today
    case .tomorrow: return snapshot.strings.tomorrow
    case .other: return "\(dayNamePart)\(day.dayOfMonth)\(monthPart)"
    }
  }

  private enum DayRelation { case today, tomorrow, other }

  private var relationToToday: DayRelation {
    let df = DateFormatter()
    df.calendar = Calendar(identifier: .gregorian)
    df.locale = Locale(identifier: "en_US_POSIX")
    df.dateFormat = "yyyy-MM-dd"
    let today = df.string(from: Date())
    let tomorrow = df.string(from: Date().addingTimeInterval(24 * 60 * 60))
    if day.dateISO == today { return .today }
    if day.dateISO == tomorrow { return .tomorrow }
    return .other
  }

  private func safeIndex(_ array: [String], _ index: Int) -> String? {
    guard index >= 0, index < array.count else { return nil }
    return array[index]
  }
}
