// DayView.swift
//
// Full lesson list for a single day (used for the "next day" screen reached
// from the home screen). NextDayRow is the tappable summary that links to it.

import SwiftUI

struct DayView: View {
  let day: WidgetDayBlock
  var strings: WidgetStrings?

  var body: some View {
    let lessons = myLessons(day)
    List {
      if lessons.isEmpty {
        Text(day.holidayName ?? strings?.noClasses ?? "Пар нет")
          .font(.footnote)
          .foregroundStyle(.secondary)
      } else {
        ForEach(Array(lessons.enumerated()), id: \.offset) { _, lesson in
          LessonRow(lesson: lesson, strings: strings)
        }
      }
    }
    .navigationTitle(dayLabel(day, strings))
  }
}

struct NextDayRow: View {
  let day: WidgetDayBlock
  var strings: WidgetStrings?

  var body: some View {
    let lessons = myLessons(day)
    HStack {
      VStack(alignment: .leading, spacing: 2) {
        Text(dayLabel(day, strings))
          .font(.headline)
        if let first = lessons.first {
          Text("\(lessons.count) · \(first.startTime)")
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
      }
      Spacer()
      Image(systemName: "chevron.forward")
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
  }
}
