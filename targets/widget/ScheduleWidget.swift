import WidgetKit
import SwiftUI
import UIKit

// MARK: - Data models (match TS WidgetSnapshot)

struct WidgetLesson: Codable {
    let subject: String
    let typeAbbrev: String?
    let typeColorHex: String
    let startTime: String
    let endTime: String
    let auditories: [String]
    let teacher: String?
    let teacherPhotoUrl: String?
    let numSubgroup: Int
    let isMine: Bool
    let note: String?
}

struct WidgetDayBlock: Codable {
    let dateISO: String
    let dayOfWeek: Int
    let dayOfMonth: Int
    let month: Int
    let lessons: [WidgetLesson]
    let holidayName: String?
}

struct WidgetSnapshot: Codable {
    let groupName: String
    let generatedAt: String
    let currentWeek: Int
    let subgroup: Int
    let today: WidgetDayBlock
    let nextDay: WidgetDayBlock?
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

// MARK: - Helpers

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

private let dayNamesShort = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"]
private let monthNames = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
]

func formatDayLabel(_ block: WidgetDayBlock) -> String {
    let dow = dayNamesShort[block.dayOfWeek]
    let month = monthNames[block.month]
    return "\(dow), \(block.dayOfMonth) \(month)"
}

/// Minutes since midnight from "HH:mm" string.
func minutesFromTime(_ time: String) -> Int? {
    let parts = time.split(separator: ":")
    guard parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]) else { return nil }
    return h * 60 + m
}

/// Filter lessons: keep only those whose endTime is after the given minutes-since-midnight.
func remainingLessons(from lessons: [WidgetLesson], afterMinutes: Int) -> [WidgetLesson] {
    lessons.filter { lesson in
        guard let end = minutesFromTime(lesson.endTime) else { return true }
        return end > afterMinutes
    }
}

/// Current time as minutes since midnight.
func nowMinutes() -> Int {
    let cal = Calendar.current
    let now = Date()
    return cal.component(.hour, from: now) * 60 + cal.component(.minute, from: now)
}

// MARK: - Photo downloader

func downloadPhotos(for lessons: [WidgetLesson], completion: @escaping ([String: Data]) -> Void) {
    let mine = lessons.filter { $0.isMine }
    let uniqueUrls = Set(mine.compactMap { $0.teacherPhotoUrl })
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

// MARK: - Timeline

struct ScheduleEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
    let photos: [String: Data]
    /// Which day block to display: today's remaining or nextDay.
    let displayBlock: WidgetDayBlock?
    /// True if displayBlock is NOT today (i.e. showing next day).
    let isNextDay: Bool
    /// Lessons to show (already filtered for remaining if today).
    let visibleLessons: [WidgetLesson]
}

struct ScheduleTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> ScheduleEntry {
        ScheduleEntry(date: .now, snapshot: nil, photos: [:],
                      displayBlock: nil, isNextDay: false, visibleLessons: [])
    }

    func getSnapshot(in context: Context, completion: @escaping (ScheduleEntry) -> Void) {
        let entry = buildCurrentEntry(snapshot: loadSnapshot(), photos: [:])
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ScheduleEntry>) -> Void) {
        let snapshot = loadSnapshot()
        let allLessons = (snapshot?.today.lessons ?? []) + (snapshot?.nextDay?.lessons ?? [])
        let mineLessons = allLessons.filter { $0.isMine }

        downloadPhotos(for: mineLessons) { photos in
            var entries: [ScheduleEntry] = []
            let cal = Calendar.current

            // Entry for right now
            entries.append(buildCurrentEntry(snapshot: snapshot, photos: photos))

            // Generate entries at each lesson boundary (start and end times) for today
            if let snap = snapshot {
                let todayLessons = snap.today.lessons
                var times = Set<Int>()
                for lesson in todayLessons {
                    if let s = minutesFromTime(lesson.startTime) { times.insert(s) }
                    if let e = minutesFromTime(lesson.endTime) { times.insert(e) }
                }

                let current = nowMinutes()
                for mins in times.sorted() where mins > current {
                    if let entryDate = cal.date(bySettingHour: mins / 60, minute: mins % 60, second: 0, of: Date()) {
                        entries.append(buildEntry(at: entryDate, afterMinutes: mins, snapshot: snap, photos: photos))
                    }
                }

                // Entry at midnight for next day rollover — use buildEntry
                // so stale-snapshot logic correctly treats nextDay as "today".
                if let tomorrow = cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: Date())) {
                    entries.append(buildEntry(at: tomorrow, afterMinutes: 0, snapshot: snap, photos: photos))
                }
            }

            // Fallback: refresh at least every 2 hours
            let fallback = cal.date(byAdding: .hour, value: 2, to: Date()) ?? Date()
            completion(Timeline(entries: entries, policy: .after(fallback)))
        }
    }

    private func buildCurrentEntry(snapshot: WidgetSnapshot?, photos: [String: Data]) -> ScheduleEntry {
        guard let snap = snapshot else {
            return ScheduleEntry(date: .now, snapshot: nil, photos: photos,
                                 displayBlock: nil, isNextDay: false, visibleLessons: [])
        }
        return buildEntry(at: Date(), afterMinutes: nowMinutes(), snapshot: snap, photos: photos)
    }

    private func buildEntry(at date: Date, afterMinutes: Int, snapshot: WidgetSnapshot, photos: [String: Data]) -> ScheduleEntry {
        let cal = Calendar.current
        let todayISO = isoString(from: cal.startOfDay(for: date))

        // If the snapshot's "today" matches the real current date, use normal logic.
        if snapshot.today.dateISO == todayISO {
            let remaining = remainingLessons(from: snapshot.today.lessons, afterMinutes: afterMinutes)

            if !remaining.isEmpty {
                return ScheduleEntry(
                    date: date, snapshot: snapshot, photos: photos,
                    displayBlock: snapshot.today, isNextDay: false,
                    visibleLessons: remaining
                )
            }

            // Today is done — show next day
            return ScheduleEntry(
                date: date, snapshot: snapshot, photos: photos,
                displayBlock: snapshot.nextDay, isNextDay: snapshot.nextDay != nil,
                visibleLessons: snapshot.nextDay?.lessons ?? []
            )
        }

        // Snapshot is stale — "today" in the snapshot is actually yesterday (or older).
        // Check if nextDay matches the real today.
        if let next = snapshot.nextDay, next.dateISO == todayISO {
            let remaining = remainingLessons(from: next.lessons, afterMinutes: afterMinutes)
            return ScheduleEntry(
                date: date, snapshot: snapshot, photos: photos,
                displayBlock: next, isNextDay: false,
                visibleLessons: remaining.isEmpty ? next.lessons : remaining
            )
        }

        // Snapshot is too old — neither today nor nextDay matches. Show whatever we have.
        return ScheduleEntry(
            date: date, snapshot: snapshot, photos: photos,
            displayBlock: snapshot.nextDay ?? snapshot.today,
            isNextDay: snapshot.nextDay != nil,
            visibleLessons: snapshot.nextDay?.lessons ?? snapshot.today.lessons
        )
    }

    private func isoString(from date: Date) -> String {
        let cal = Calendar.current
        let y = cal.component(.year, from: date)
        let m = cal.component(.month, from: date)
        let d = cal.component(.day, from: date)
        return String(format: "%04d-%02d-%02d", y, m, d)
    }
}

// MARK: - Reusable views

struct LessonRow: View {
    let lesson: WidgetLesson
    let photo: Data?
    var compact: Bool = false
    var showNote: Bool = false

    var body: some View {
        if lesson.isMine {
            fullRow
        } else {
            compactRow
        }
    }

    private var fullRow: some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 2)
                .fill(Color(hex: lesson.typeColorHex))
                .frame(width: 4)

            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 4) {
                    Text(lesson.subject)
                        .font(.system(size: compact ? 12 : 13, weight: .semibold))
                        .lineLimit(1)

                    if lesson.numSubgroup == 1 || lesson.numSubgroup == 2 {
                        Text("\(lesson.numSubgroup) п/г")
                            .font(.system(size: compact ? 9 : 10, weight: .medium))
                            .foregroundColor(Color(hex: lesson.typeColorHex))
                    }
                }

                HStack(spacing: 3) {
                    Text("\(lesson.startTime)–\(lesson.endTime)")
                        .font(.system(size: compact ? 10 : 11))
                        .foregroundColor(.secondary)

                    if !lesson.auditories.isEmpty {
                        Text("·").foregroundColor(.secondary)
                        Text(lesson.auditories.joined(separator: ", "))
                            .font(.system(size: compact ? 10 : 11, weight: .medium))
                            .lineLimit(1)
                    }
                }

                if showNote, let note = lesson.note, !note.isEmpty {
                    Text(note)
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                        .italic()
                        .lineLimit(1)
                }
            }

            Spacer(minLength: 0)

            if !compact, let data = photo, let img = UIImage(data: data) {
                Image(uiImage: img)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 28, height: 28)
                    .clipShape(Circle())
            }
        }
    }

    /// Compact row for lessons of another subgroup — dashed outline.
    private var compactRow: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 4) {
                Text(lesson.subject)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.secondary)
                    .lineLimit(1)

                if lesson.numSubgroup == 1 || lesson.numSubgroup == 2 {
                    Text("\(lesson.numSubgroup) п/г")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(Color(hex: lesson.typeColorHex))
                }

                Spacer(minLength: 0)
            }

            Text("\(lesson.startTime)–\(lesson.endTime)")
                .font(.system(size: 10))
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 2)
        .padding(.horizontal, 6)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .strokeBorder(Color(hex: lesson.typeColorHex).opacity(0.5), style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
        )
    }
}

struct EmptyStateView: View {
    var allDone: Bool = false
    var holidayName: String? = nil
    var displayBlock: WidgetDayBlock? = nil

    var body: some View {
        VStack(spacing: 6) {
            if let holiday = holidayName {
                Image(systemName: "star.fill")
                    .font(.title2)
                    .foregroundColor(.orange)
                Text(holiday)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
                if let block = displayBlock {
                    Text(formatDayLabel(block))
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }
            } else {
                Image(systemName: allDone ? "checkmark.circle" : "calendar")
                    .font(.title2)
                    .foregroundColor(.secondary)
                Text(allDone ? "На сегодня пар больше нет" : "Нет пар")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct WidgetHeader: View {
    let groupName: String
    let currentWeek: Int
    var dateLabel: String? = nil
    var showWeek: Bool = true

    var body: some View {
        HStack {
            Text(groupName)
                .font(.system(size: 11))
                .foregroundColor(.secondary)
            if let label = dateLabel {
                Text(label)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.orange)
            }
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
    let entry: ScheduleEntry

    var body: some View {
        if let snap = entry.snapshot {
            if let holiday = entry.displayBlock?.holidayName {
                EmptyStateView(holidayName: holiday, displayBlock: entry.displayBlock)
            } else if !entry.visibleLessons.isEmpty {
                let lessons = Array(entry.visibleLessons.prefix(2))
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(snap.groupName)
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                        if entry.isNextDay, let block = entry.displayBlock {
                            Text(formatDayLabel(block))
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.orange)
                        }
                        Spacer()
                    }

                    ForEach(Array(lessons.enumerated()), id: \.offset) { _, lesson in
                        LessonRow(lesson: lesson, photo: nil, compact: true)
                    }

                    Spacer(minLength: 0)
                }
            } else {
                EmptyStateView(allDone: !snap.today.lessons.isEmpty)
            }
        } else {
            EmptyStateView()
        }
    }
}

// MARK: - Medium widget

struct MediumWidgetView: View {
    let entry: ScheduleEntry

    var body: some View {
        if let snap = entry.snapshot {
            if let holiday = entry.displayBlock?.holidayName {
                EmptyStateView(holidayName: holiday, displayBlock: entry.displayBlock)
            } else if !entry.visibleLessons.isEmpty {
                let lessons = Array(entry.visibleLessons.prefix(3))
                VStack(alignment: .leading, spacing: 4) {
                    WidgetHeader(
                        groupName: snap.groupName,
                        currentWeek: snap.currentWeek,
                        dateLabel: entry.isNextDay ? (entry.displayBlock.map { formatDayLabel($0) }) : nil
                    )

                    ForEach(Array(lessons.enumerated()), id: \.offset) { _, lesson in
                        LessonRow(lesson: lesson, photo: entry.photos[lesson.teacherPhotoUrl ?? ""])
                    }

                    Spacer(minLength: 0)
                }
            } else {
                EmptyStateView(allDone: !snap.today.lessons.isEmpty)
            }
        } else {
            EmptyStateView()
        }
    }
}

// MARK: - Large widget

struct LargeWidgetView: View {
    let entry: ScheduleEntry

    var body: some View {
        if let snap = entry.snapshot {
            if let holiday = entry.displayBlock?.holidayName {
                EmptyStateView(holidayName: holiday, displayBlock: entry.displayBlock)
            } else if !entry.visibleLessons.isEmpty {
                let visible = Array(entry.visibleLessons.prefix(7))
                VStack(alignment: .leading, spacing: 6) {
                    WidgetHeader(
                        groupName: snap.groupName,
                        currentWeek: snap.currentWeek,
                        dateLabel: entry.isNextDay ? (entry.displayBlock.map { formatDayLabel($0) }) : nil
                    )

                    ForEach(Array(visible.enumerated()), id: \.offset) { index, lesson in
                        LessonRow(lesson: lesson, photo: entry.photos[lesson.teacherPhotoUrl ?? ""], showNote: true)
                        if index < visible.count - 1 {
                            Divider()
                        }
                    }

                    Spacer(minLength: 0)
                }
            } else {
                EmptyStateView(allDone: !snap.today.lessons.isEmpty)
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
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            MediumWidgetView(entry: entry)
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
                    .widgetURL(URL(string: "bsuirtime://"))
            } else {
                ScheduleWidgetEntryView(entry: entry)
                    .padding(12)
                    .background()
                    .widgetURL(URL(string: "bsuirtime://"))
            }
        }
        .configurationDisplayName("Bsuir Time")
        .description("Расписание занятий")
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
