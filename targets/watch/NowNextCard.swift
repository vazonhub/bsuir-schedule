// NowNextCard.swift
//
// Prominent "now / next" hero at the top of the home screen.

import SwiftUI

struct NowNextCard: View {
  let selection: HeroSelection
  /// Date label shown when the next lesson is on another day (e.g. "17 июля").
  var dayLabel: String?
  var strings: WidgetStrings?

  var body: some View {
    let lesson = selection.lesson
    let typeColor = Color(hex: lesson.typeColorHex) ?? .gray

    VStack(alignment: .leading, spacing: 5) {
      HStack {
        Text(labelText)
          .font(.caption2)
          .fontWeight(.semibold)
          .textCase(.uppercase)
          .foregroundStyle(selection.isNow ? Color.green : Color.accentColor)
        Spacer()
        Text("\(lesson.startTime)–\(lesson.endTime)")
          .font(.caption2)
          .foregroundStyle(.secondary)
      }

      Text(lesson.subject)
        .font(.headline)
        .lineLimit(2)

      HStack(spacing: 6) {
        if let type = lesson.typeAbbrev {
          Text(type)
            .font(.caption2)
            .fontWeight(.semibold)
            .padding(.horizontal, 5)
            .padding(.vertical, 1)
            .background(typeColor.opacity(0.25), in: Capsule())
            .foregroundStyle(typeColor)
        }
        if lesson.numSubgroup != 0 {
          Text("\(strings?.subgroupShort ?? "п")\(lesson.numSubgroup)")
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
        if !lesson.auditories.isEmpty {
          Text(lesson.auditories.joined(separator: ", "))
            .font(.caption2)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
      }

      if let teacher = lesson.teacher {
        Text(teacher)
          .font(.caption2)
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }
    }
    .padding(.vertical, 3)
  }

  private var labelText: String {
    if selection.isNow { return strings?.now ?? "Сейчас" }
    let next = strings?.next ?? "Далее"
    if let dayLabel { return "\(next) · \(dayLabel)" }
    return next
  }
}
