import WidgetKit
import SwiftUI

// MARK: - Data models (match JS WidgetSnapshot)

struct WidgetLesson: Codable {
    let subject: String
    let typeAbbrev: String?
    let typeColorHex: String
    let startTime: String
    let endTime: String
    let auditories: [String]
    let teacher: String?
}

struct WidgetSnapshot: Codable {
    let groupName: String
    let generatedAt: String
    let currentWeek: Int
    let todayLessons: [WidgetLesson]
    let upcomingLessons: [WidgetLesson]
}

// MARK: - Shared storage reader

private let appGroup = "group.by.vazon.bsuirschedule"
private let storageKey = "widgetSnapshot"

func loadSnapshot() -> WidgetSnapshot? {
    guard let defaults = UserDefaults(suiteName: appGroup),
          let data = defaults.data(forKey: storageKey) else {
        // react-native-shared-group-preferences wraps values in a JSON object
        // Try reading as string then decoding
        guard let defaults = UserDefaults(suiteName: appGroup),
              let raw = defaults.string(forKey: storageKey),
              let jsonData = raw.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: jsonData)
    }
    return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
}

// MARK: - Color from hex

extension Color {
    init(hex: String) {
        let h = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var rgb: UInt64 = 0
        Scanner(string: h).scanHexInt64(&rgb)
        self.init(
            red: Double((rgb >> 16) & 0xFF) / 255,
            green: Double((rgb >> 8) & 0xFF) / 255,
            blue: Double(rgb & 0xFF) / 255
        )
    }
}

// MARK: - Timeline

struct ScheduleEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
}

struct ScheduleTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> ScheduleEntry {
        ScheduleEntry(date: .now, snapshot: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (ScheduleEntry) -> Void) {
        completion(ScheduleEntry(date: .now, snapshot: loadSnapshot()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ScheduleEntry>) -> Void) {
        let entry = ScheduleEntry(date: .now, snapshot: loadSnapshot())
        // Refresh every hour
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: .now) ?? .now
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Widget views

struct LessonRow: View {
    let lesson: WidgetLesson

    var body: some View {
        HStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 2)
                .fill(Color(hex: lesson.typeColorHex))
                .frame(width: 4)

            VStack(alignment: .leading, spacing: 2) {
                Text(lesson.subject)
                    .font(.system(size: 14, weight: .semibold))
                    .lineLimit(1)

                HStack(spacing: 4) {
                    Text("\(lesson.startTime)–\(lesson.endTime)")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)

                    if !lesson.auditories.isEmpty {
                        Text("·")
                            .foregroundColor(.secondary)
                        Text(lesson.auditories.joined(separator: ", "))
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
            }

            Spacer(minLength: 0)
        }
    }
}

struct SmallWidgetView: View {
    let snapshot: WidgetSnapshot?

    var body: some View {
        if let snap = snapshot, let lesson = snap.upcomingLessons.first {
            VStack(alignment: .leading, spacing: 6) {
                Text(snap.groupName)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)

                Spacer(minLength: 0)

                LessonRow(lesson: lesson)

                if let teacher = lesson.teacher {
                    Text(teacher)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
            .padding()
        } else {
            VStack(spacing: 8) {
                Image(systemName: "calendar")
                    .font(.title2)
                    .foregroundColor(.secondary)
                Text("Нет пар")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct MediumWidgetView: View {
    let snapshot: WidgetSnapshot?

    var body: some View {
        if let snap = snapshot, !snap.upcomingLessons.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(snap.groupName)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)

                    Spacer()

                    Text("Неделя \(snap.currentWeek)")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }

                ForEach(Array(snap.upcomingLessons.prefix(3).enumerated()), id: \.offset) { _, lesson in
                    LessonRow(lesson: lesson)
                }

                Spacer(minLength: 0)
            }
            .padding()
        } else {
            VStack(spacing: 8) {
                Image(systemName: "calendar")
                    .font(.title2)
                    .foregroundColor(.secondary)
                Text("Нет предстоящих пар")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Widget declaration

struct ScheduleWidget: Widget {
    let kind = "ScheduleWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ScheduleTimelineProvider()) { entry in
            if #available(iOS 17, *) {
                ScheduleWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                ScheduleWidgetEntryView(entry: entry)
                    .padding()
                    .background()
            }
        }
        .configurationDisplayName("Расписание БГУИР")
        .description("Ближайшие пары закреплённой группы")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct ScheduleWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: ScheduleEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(snapshot: entry.snapshot)
        case .systemMedium:
            MediumWidgetView(snapshot: entry.snapshot)
        default:
            MediumWidgetView(snapshot: entry.snapshot)
        }
    }
}

// MARK: - Bundle

@main
struct ScheduleWidgetBundle: WidgetBundle {
    var body: some Widget {
        ScheduleWidget()
    }
}
