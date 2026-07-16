// ScheduleComplication.swift
//
// watchOS WidgetKit complications (accessory families) for the watch face and
// Smart Stack. Reads the snapshot the watch app cached into the shared App
// Group and reuses heroSelection() so "now / next" is computed the same way as
// the app UI. Shares SnapshotModel.swift + LessonSupport.swift with the watch
// app target (compiled into both).

import SwiftUI
import WidgetKit

private let appGroupId = "group.by.vazon.bsuirschedule"
private let storageKey = "widgetSnapshot"

private func loadSnapshot() -> WidgetSnapshot? {
  guard let defaults = UserDefaults(suiteName: appGroupId),
        let json = defaults.string(forKey: storageKey),
        let data = json.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
}

// MARK: - Timeline

struct ComplicationEntry: TimelineEntry {
  let date: Date
  let hero: HeroSelection?
  let strings: WidgetStrings?
}

struct ComplicationProvider: TimelineProvider {
  func placeholder(in context: Context) -> ComplicationEntry {
    ComplicationEntry(date: Date(), hero: nil, strings: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (ComplicationEntry) -> Void) {
    completion(entry(at: Date()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<ComplicationEntry>) -> Void) {
    let now = Date()
    var dates: [Date] = [now]

    // Add an entry at each future lesson start/end today so the "now / next"
    // rolls forward through the day without waiting for a background refresh.
    if let snapshot = loadSnapshot() {
      let calendar = Calendar.current
      for lesson in myLessons(snapshot.today) {
        for hhmm in [lesson.startTime, lesson.endTime] {
          if let mins = parseMinutes(hhmm),
             let boundary = calendar.date(bySettingHour: mins / 60, minute: mins % 60, second: 0, of: now),
             boundary > now {
            dates.append(boundary)
          }
        }
      }
    }

    let entries = Array(Set(dates)).sorted().map { entry(at: $0) }
    completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(2 * 3600))))
  }

  private func entry(at date: Date) -> ComplicationEntry {
    let snapshot = loadSnapshot()
    let hero = snapshot.flatMap { heroSelection($0, now: nowMinutes(date)) }
    return ComplicationEntry(date: date, hero: hero, strings: snapshot?.strings)
  }
}

// MARK: - Views

struct ScheduleComplicationEntryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: ComplicationEntry

  private var hero: HeroSelection? { entry.hero }

  var body: some View {
    switch family {
    case .accessoryInline: inlineView
    case .accessoryCircular: circularView
    case .accessoryCorner: cornerView
    default: rectangularView
    }
  }

  @ViewBuilder private var inlineView: some View {
    if let hero {
      Text("\(hero.lesson.startTime) \(hero.lesson.subject)")
    } else {
      Text(entry.strings?.allDone ?? "Пар нет")
    }
  }

  @ViewBuilder private var circularView: some View {
    if let hero {
      VStack(spacing: 0) {
        Text(hero.lesson.startTime)
          .font(.system(size: 13, weight: .semibold))
        Text(hero.lesson.subject)
          .font(.system(size: 9))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
    } else {
      Image(systemName: "checkmark.circle")
    }
  }

  @ViewBuilder private var rectangularView: some View {
    if let hero {
      VStack(alignment: .leading, spacing: 1) {
        HStack {
          Text(hero.isNow ? (entry.strings?.now ?? "Сейчас") : (entry.strings?.next ?? "Далее"))
            .font(.caption2)
            .foregroundStyle(.secondary)
          Spacer()
          Text(hero.lesson.startTime)
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
        Text(hero.lesson.subject)
          .font(.headline)
          .lineLimit(1)
        if !hero.lesson.auditories.isEmpty {
          Text(hero.lesson.auditories.joined(separator: ", "))
            .font(.caption2)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
      }
    } else {
      Text(entry.strings?.allDone ?? "На сегодня всё")
        .font(.caption)
    }
  }

  @ViewBuilder private var cornerView: some View {
    if let hero {
      Text(hero.lesson.startTime)
        .widgetLabel(hero.lesson.subject)
    } else {
      Image(systemName: "checkmark.circle")
    }
  }
}

// MARK: - Widget

struct ScheduleComplication: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "ScheduleComplication", provider: ComplicationProvider()) { entry in
      ScheduleComplicationEntryView(entry: entry)
    }
    .configurationDisplayName("Расписание")
    .description("Следующая пара")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
  }
}

@main
struct BsuirWatchWidgetBundle: WidgetBundle {
  var body: some Widget {
    ScheduleComplication()
  }
}
