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
    let teacherPhotoUrl: String?
}

struct WidgetSnapshot: Codable {
    let groupName: String
    let generatedAt: String
    let currentWeek: Int
    let todayLessons: [WidgetLesson]
}

// MARK: - Shared storage reader

private let appGroup = "group.by.vazon.bsuirschedule"
private let storageKey = "widgetSnapshot"

func loadSnapshot() -> WidgetSnapshot? {
    guard let defaults = UserDefaults(suiteName: appGroup) else { return nil }
    if let data = defaults.data(forKey: storageKey) {
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }
    if let raw = defaults.string(forKey: storageKey),
       let jsonData = raw.data(using: .utf8) {
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: jsonData)
    }
    return nil
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

// MARK: - Photo downloader

func downloadPhotos(for lessons: [WidgetLesson], completion: @escaping ([String: Data]) -> Void) {
    let uniqueUrls = Set(lessons.compactMap { $0.teacherPhotoUrl })
    guard !uniqueUrls.isEmpty else { completion([:]); return }

    let lock = NSLock()
    var cache: [String: Data] = [:]
    let group = DispatchGroup()

    for urlStr in uniqueUrls {
        guard let url = URL(string: urlStr) else { continue }
        group.enter()
        var request = URLRequest(url: url)
        request.timeoutInterval = 5
        URLSession.shared.dataTask(with: request) { data, _, _ in
            if let data = data {
                lock.lock()
                cache[urlStr] = data
                lock.unlock()
            }
            group.leave()
        }.resume()
    }

    group.notify(queue: .main) { completion(cache) }
}

// MARK: - Filter: only lessons not yet finished

func remainingLessons(from lessons: [WidgetLesson]) -> [WidgetLesson] {
    let now = Date()
    let cal = Calendar.current
    let nowMinutes = cal.component(.hour, from: now) * 60 + cal.component(.minute, from: now)

    return lessons.filter { lesson in
        let parts = lesson.endTime.split(separator: ":")
        guard parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]) else { return true }
        return h * 60 + m > nowMinutes
    }
}

// MARK: - Timeline

struct ScheduleEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
    let photos: [String: Data]
}

struct ScheduleTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> ScheduleEntry {
        ScheduleEntry(date: .now, snapshot: nil, photos: [:])
    }

    func getSnapshot(in context: Context, completion: @escaping (ScheduleEntry) -> Void) {
        completion(ScheduleEntry(date: .now, snapshot: loadSnapshot(), photos: [:]))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ScheduleEntry>) -> Void) {
        let snapshot = loadSnapshot()
        let lessons = snapshot?.todayLessons ?? []

        downloadPhotos(for: lessons) { photos in
            let entry = ScheduleEntry(date: .now, snapshot: snapshot, photos: photos)
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now
            completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
        }
    }
}

// MARK: - Reusable views

struct LessonRow: View {
    let lesson: WidgetLesson
    let photo: Data?
    var compact: Bool = false

    var body: some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 2)
                .fill(Color(hex: lesson.typeColorHex))
                .frame(width: 4)

            VStack(alignment: .leading, spacing: 1) {
                Text(lesson.subject)
                    .font(.system(size: compact ? 12 : 13, weight: .semibold))
                    .lineLimit(1)

                HStack(spacing: 3) {
                    Text("\(lesson.startTime)–\(lesson.endTime)")
                        .font(.system(size: compact ? 10 : 11))
                        .foregroundColor(.secondary)

                    if !lesson.auditories.isEmpty {
                        Text("·")
                            .foregroundColor(.secondary)
                        Text(lesson.auditories.joined(separator: ", "))
                            .font(.system(size: compact ? 10 : 11, weight: .medium))
                            .lineLimit(1)
                    }
                }
            }

            Spacer(minLength: 0)

            if let data = photo, let img = UIImage(data: data) {
                Image(uiImage: img)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: compact ? 24 : 28, height: compact ? 24 : 28)
                    .clipShape(Circle())
            }
        }
    }
}

struct EmptyStateView: View {
    /// true when today had lessons but all have ended
    var allDone: Bool = false

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: allDone ? "checkmark.circle" : "calendar")
                .font(.title2)
                .foregroundColor(.secondary)
            Text(allDone ? "На сегодня пар больше нет" : "Нет пар")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct WidgetHeader: View {
    let groupName: String
    let currentWeek: Int
    var showWeek: Bool = true

    var body: some View {
        HStack {
            Text(groupName)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            Spacer()
            if showWeek {
                Text("Неделя \(currentWeek)")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Small widget

struct SmallWidgetView: View {
    let snapshot: WidgetSnapshot?
    let photos: [String: Data]

    var body: some View {
        if let snap = snapshot {
            let lessons = remainingLessons(from: snap.todayLessons)
            if !lessons.isEmpty {
                VStack(alignment: .leading, spacing: 3) {
                    Text(snap.groupName)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)

                    Spacer(minLength: 0)

                    ForEach(Array(lessons.prefix(2).enumerated()), id: \.offset) { _, lesson in
                        LessonRow(lesson: lesson, photo: nil, compact: true)
                    }
                }
            } else {
                EmptyStateView(allDone: !snap.todayLessons.isEmpty)
            }
        } else {
            EmptyStateView()
        }
    }
}

// MARK: - Medium widget

struct MediumWidgetView: View {
    let snapshot: WidgetSnapshot?
    let photos: [String: Data]

    var body: some View {
        if let snap = snapshot {
            let lessons = remainingLessons(from: snap.todayLessons)
            if !lessons.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    WidgetHeader(groupName: snap.groupName, currentWeek: snap.currentWeek)

                    ForEach(Array(lessons.prefix(3).enumerated()), id: \.offset) { _, lesson in
                        LessonRow(lesson: lesson, photo: photos[lesson.teacherPhotoUrl ?? ""])
                    }

                    Spacer(minLength: 0)
                }
            } else {
                EmptyStateView(allDone: !snap.todayLessons.isEmpty)
            }
        } else {
            EmptyStateView()
        }
    }
}

// MARK: - Large widget

struct LargeWidgetView: View {
    let snapshot: WidgetSnapshot?
    let photos: [String: Data]

    var body: some View {
        if let snap = snapshot {
            let lessons = remainingLessons(from: snap.todayLessons)
            if !lessons.isEmpty {
                let visible = Array(lessons.prefix(7))
                VStack(alignment: .leading, spacing: 6) {
                    WidgetHeader(groupName: snap.groupName, currentWeek: snap.currentWeek)

                    ForEach(Array(visible.enumerated()), id: \.offset) { index, lesson in
                        LessonRow(lesson: lesson, photo: photos[lesson.teacherPhotoUrl ?? ""])
                        if index < visible.count - 1 {
                            Divider()
                        }
                    }

                    Spacer(minLength: 0)
                }
            } else {
                EmptyStateView(allDone: !snap.todayLessons.isEmpty)
            }
        } else {
            EmptyStateView()
        }
    }
}

// MARK: - Entry view router

struct ScheduleWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: ScheduleEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(snapshot: entry.snapshot, photos: entry.photos)
        case .systemMedium:
            MediumWidgetView(snapshot: entry.snapshot, photos: entry.photos)
        case .systemLarge:
            LargeWidgetView(snapshot: entry.snapshot, photos: entry.photos)
        default:
            MediumWidgetView(snapshot: entry.snapshot, photos: entry.photos)
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
                    .padding(12)
                    .background()
            }
        }
        .configurationDisplayName("Bsuir Time")
        .description("Оставшиеся пары на сегодня")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Bundle

@main
struct ScheduleWidgetBundle: WidgetBundle {
    var body: some Widget {
        ScheduleWidget()
    }
}
