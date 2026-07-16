// ContentView.swift
//
// Root of the watch UI. Composes the home screen (now/next hero + today's
// lessons + next-day link) from the decoded snapshot, or an empty state
// before the first iCloud sync. Reloads when the app becomes active and
// schedules background refresh when it leaves the foreground.

import SwiftUI

struct ContentView: View {
  @EnvironmentObject private var store: SnapshotStore
  @Environment(\.scenePhase) private var scenePhase

  var body: some View {
    NavigationStack {
      if let snapshot = store.snapshot {
        HomeView(snapshot: snapshot)
      } else {
        EmptyState()
      }
    }
    .onChange(of: scenePhase) { phase in
      switch phase {
      case .active:
        store.reload()
      case .background:
        scheduleWatchRefresh()
      default:
        break
      }
    }
  }
}

private struct HomeView: View {
  let snapshot: WidgetSnapshot

  var body: some View {
    let strings = snapshot.strings
    let date = Date()
    let now = nowMinutes(date)
    // Reconcile against the real current date — the snapshot may be stale.
    let (today, nextDay) = resolvedDays(snapshot, todayISO: currentDateISO(date))
    let todayLessons = today.map(myLessons) ?? []
    let hero = heroSelection(snapshot, at: date)

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
        if today == nil {
          // Snapshot is too old to describe the real today.
          Text("Данные устарели — откройте приложение на iPhone")
            .font(.footnote)
            .foregroundStyle(.secondary)
        } else if todayLessons.isEmpty {
          Text(today?.holidayName ?? strings?.noClasses ?? "Пар нет")
            .font(.footnote)
            .foregroundStyle(.secondary)
        } else {
          ForEach(Array(todayLessons.enumerated()), id: \.offset) { _, lesson in
            LessonRow(lesson: lesson, strings: strings, dimmed: phase(lesson, now: now) == .past)
          }
        }
      } header: {
        Text(today.map { dayLabel($0, strings) } ?? dayLabel(date, strings))
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
