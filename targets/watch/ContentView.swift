// ContentView.swift
//
// Root of the watch UI. Composes the home screen (now/next hero + today's
// lessons + next-day link) from the decoded snapshot, or an empty state
// before the first iCloud sync.

import SwiftUI

struct ContentView: View {
  @EnvironmentObject private var store: SnapshotStore

  var body: some View {
    NavigationStack {
      if let snapshot = store.snapshot {
        HomeView(snapshot: snapshot)
      } else {
        EmptyState()
      }
    }
  }
}

private struct HomeView: View {
  let snapshot: WidgetSnapshot

  var body: some View {
    let strings = snapshot.strings
    let now = nowMinutes()
    let today = myLessons(snapshot.today)
    let hero = heroSelection(snapshot, now: now)
    let nextDay = snapshot.nextDay

    List {
      Section {
        if let hero {
          NowNextCard(
            selection: hero,
            dayLabel: hero.isTomorrow ? nextDay.map { dayLabel($0, strings) } : nil,
            strings: strings
          )
        } else {
          Text(strings?.allDone ?? "На сегодня всё")
            .font(.callout)
            .foregroundStyle(.secondary)
        }
      } footer: {
        Text("\(strings?.weekLabel ?? "Неделя") \(snapshot.currentWeek)")
      }

      Section {
        if today.isEmpty {
          Text(snapshot.today.holidayName ?? strings?.noClasses ?? "Пар нет")
            .font(.footnote)
            .foregroundStyle(.secondary)
        } else {
          ForEach(Array(today.enumerated()), id: \.offset) { _, lesson in
            LessonRow(lesson: lesson, strings: strings, dimmed: phase(lesson, now: now) == .past)
          }
        }
      } header: {
        Text(dayLabel(snapshot.today, strings))
      }

      if let nextDay, !myLessons(nextDay).isEmpty {
        Section {
          NavigationLink {
            DayView(day: nextDay, strings: strings)
          } label: {
            NextDayRow(day: nextDay, strings: strings)
          }
        }
      }
    }
    .navigationTitle(snapshot.groupName)
  }
}

private struct EmptyState: View {
  var body: some View {
    VStack(spacing: 6) {
      Image(systemName: "calendar")
        .font(.system(size: 28, weight: .semibold))
        .foregroundStyle(.tint)
      Text("Bsuir Time")
        .font(.headline)
      Text("Откройте приложение на iPhone,\nчтобы синхронизировать расписание")
        .font(.caption2)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
    }
    .padding()
  }
}
