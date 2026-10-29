import SwiftUI

/// Compact one-line-ish lesson row for the day list. Lessons of another subgroup
/// render muted with a dashed outline (mirrors the phone app and the iOS widget).
struct LessonRow: View {
  let lesson: WatchLesson
  let strings: WatchStrings

  var body: some View {
    if lesson.isMine {
      mineRow
    } else {
      otherSubgroupRow
    }
  }

  /// The user's own lesson — filled tile with full details.
  private var mineRow: some View {
    HStack(spacing: 8) {
      RoundedRectangle(cornerRadius: 2)
        .fill(Color(hex: lesson.typeColorHex))
        .frame(width: 4)

      VStack(alignment: .leading, spacing: 2) {
        Text("\(lesson.startTime)–\(lesson.endTime)")
          .font(.caption2)
          .foregroundStyle(.secondary)

        Text(lesson.subject)
          .font(.headline)
          .lineLimit(2)

        HStack(spacing: 6) {
          if let type = lesson.typeAbbrev, !type.isEmpty {
            Text(type)
              .font(.caption2.weight(.semibold))
              .foregroundStyle(Color(hex: lesson.typeColorHex))
          }
          if !lesson.auditories.isEmpty {
            Text(lesson.auditories.joined(separator: ", "))
              .font(.caption2)
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }
          if lesson.numSubgroup != 0 {
            Text("\(strings.subgroupShort) \(lesson.numSubgroup)")
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }
      }

      Spacer(minLength: 0)
    }
    .padding(.vertical, 6)
    .padding(.horizontal, 8)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
  }

  /// Another subgroup's lesson — muted, single-line, dashed outline in the type color.
  private var otherSubgroupRow: some View {
    VStack(alignment: .leading, spacing: 1) {
      HStack(spacing: 4) {
        Text(lesson.subject)
          .font(.caption.weight(.medium))
          .foregroundStyle(.secondary)
          .lineLimit(1)

        if lesson.numSubgroup != 0 {
          Text("\(strings.subgroupShort) \(lesson.numSubgroup)")
            .font(.caption2.weight(.medium))
            .foregroundStyle(Color(hex: lesson.typeColorHex))
        }

        Spacer(minLength: 0)
      }

      Text("\(lesson.startTime)–\(lesson.endTime)")
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
    .padding(.vertical, 5)
    .padding(.horizontal, 8)
    .frame(maxWidth: .infinity, alignment: .leading)
    .overlay(
      RoundedRectangle(cornerRadius: 10)
        .strokeBorder(
          Color(hex: lesson.typeColorHex).opacity(0.5),
          style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
    )
  }
}
