// LessonRow.swift
//
// Reusable row for a single lesson: type-color rail, subject, time,
// subgroup badge, auditories. Past lessons render dimmed.

import SwiftUI

struct LessonRow: View {
  let lesson: WidgetLesson
  var strings: WidgetStrings?
  var dimmed: Bool = false

  var body: some View {
    HStack(spacing: 8) {
      RoundedRectangle(cornerRadius: 2)
        .fill(Color(hex: lesson.typeColorHex) ?? .gray)
        .frame(width: 4)

      VStack(alignment: .leading, spacing: 2) {
        Text(lesson.subject)
          .font(.headline)
          .lineLimit(1)

        HStack(spacing: 4) {
          Text("\(lesson.startTime)–\(lesson.endTime)")
          if lesson.numSubgroup != 0 {
            Text("· \(strings?.subgroupShort ?? "п")\(lesson.numSubgroup)")
          }
        }
        .font(.caption2)
        .foregroundStyle(.secondary)

        if !lesson.auditories.isEmpty {
          Text(lesson.auditories.joined(separator: ", "))
            .font(.caption2)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
      }

      Spacer(minLength: 0)
    }
    .opacity(dimmed ? 0.45 : 1)
    .padding(.vertical, 2)
  }
}
