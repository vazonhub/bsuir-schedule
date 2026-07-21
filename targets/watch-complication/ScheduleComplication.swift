import SwiftUI
import WidgetKit

// MARK: - Timeline

struct ScheduleEntry: TimelineEntry {
  let date: Date
  let info: NextLessonInfo
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> ScheduleEntry {
    ScheduleEntry(date: Date(), info: ComplicationStore.info(now: Date()))
  }

  func getSnapshot(in context: Context, completion: @escaping (ScheduleEntry) -> Void) {
    completion(ScheduleEntry(date: Date(), info: ComplicationStore.info(now: Date())))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<ScheduleEntry>) -> Void) {
    let entries = ComplicationStore.boundaries(now: Date()).map {
      ScheduleEntry(date: $0, info: ComplicationStore.info(now: $0))
    }
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

// MARK: - Widget bundle

@main
struct BsuirComplicationBundle: WidgetBundle {
  var body: some Widget {
    NextLessonComplication()
  }
}

struct NextLessonComplication: Widget {
  let kind = "BsuirNextLesson"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      ComplicationView(entry: entry)
    }
    .configurationDisplayName("Bsuir Time")
    .description("Ближайшая пара")
    .supportedFamilies([.accessoryInline, .accessoryCircular, .accessoryRectangular])
  }
}

// MARK: - Views

struct ComplicationView: View {
  @Environment(\.widgetFamily) private var family
  let entry: ScheduleEntry

  var body: some View {
    switch family {
    case .accessoryInline:
      inline
    case .accessoryCircular:
      circular
    case .accessoryRectangular:
      rectangular
    default:
      rectangular
    }
  }

  private var lesson: CxLesson? { entry.info.lesson }

  // One line beside the clock: "09:00 ООП".
  @ViewBuilder private var inline: some View {
    if let l = lesson {
      Text("\(l.startTime) \(l.subject)")
    } else {
      Text(entry.info.noClassesText)
    }
  }

  // Tiny round complication: start time + auditory (or type), accent-tinted.
  @ViewBuilder private var circular: some View {
    ZStack {
      AccessoryWidgetBackground()
      if let l = lesson {
        VStack(spacing: 0) {
          Text(l.startTime)
            .font(.system(size: 15, weight: .semibold))
          Text(l.auditories.first ?? l.typeAbbrev ?? "")
            .font(.system(size: 11))
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
        .minimumScaleFactor(0.7)
      } else {
        Image(systemName: "checkmark")
          .font(.system(size: 16, weight: .semibold))
      }
    }
  }

  // Rectangular: time (+relative day), subject, type · auditory.
  @ViewBuilder private var rectangular: some View {
    if let l = lesson {
      VStack(alignment: .leading, spacing: 1) {
        HStack(spacing: 4) {
          Text("\(l.startTime)–\(l.endTime)")
            .font(.headline)
          if let day = entry.info.dayLabel {
            Text(day)
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }
        Text(l.subject)
          .font(.body)
          .lineLimit(1)
        HStack(spacing: 4) {
          if let type = l.typeAbbrev, !type.isEmpty {
            Text(type)
              .font(.caption2)
              .foregroundStyle(Color(hex: l.typeColorHex))
          }
          if let room = l.auditories.first {
            Text(room)
              .font(.caption2)
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    } else {
      Text(entry.info.noClassesText)
        .font(.headline)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
  }
}

// MARK: - Color(hex:) (local copy; mirrors targets/watch/Theme.swift)

extension Color {
  init(hex: String) {
    let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    var rgb: UInt64 = 0
    guard Scanner(string: cleaned).scanHexInt64(&rgb), cleaned.count == 6 else {
      self = .gray
      return
    }
    self.init(
      red: Double((rgb >> 16) & 0xFF) / 255,
      green: Double((rgb >> 8) & 0xFF) / 255,
      blue: Double(rgb & 0xFF) / 255
    )
  }
}
