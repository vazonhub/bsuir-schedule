// SnapshotModel.swift
//
// Canonical Codable mirror of the `WidgetSnapshot` JSON contract produced by
// src/services/widget/widgetData.ts. This is the single source of truth the
// watch app decodes — it must stay byte-compatible with the TS shape.
//
// NOTE: targets/widget/ScheduleWidget.swift currently keeps its own inline
// copy of these structs. De-duplicating (compiling this file into the widget
// target too) is deferred tech-debt — see WATCH_PLAN.md §8.

import Foundation

struct WidgetLesson: Codable {
  let subject: String
  let typeAbbrev: String?
  let typeColorHex: String
  let startTime: String
  let endTime: String
  let auditories: [String]
  let teacher: String?
  let teacherPhotoUrl: String?
  let teacherPhotos: [String]?
  let numSubgroup: Int
  let isMine: Bool
  let note: String?
  let studentGroups: [String]?
}

struct WidgetDayBlock: Codable {
  let dateISO: String
  let dayOfWeek: Int
  let dayOfMonth: Int
  let month: Int
  let lessons: [WidgetLesson]
  let holidayName: String?
}

struct WidgetUpcoming: Codable {
  let lesson: WidgetLesson
  let dateISO: String
  let isOngoing: Bool
  let blockId: String
}

struct WidgetStrings: Codable {
  let daysShort: [String]?
  let months: [String]?
  let weekLabel: String?
  let noClasses: String?
  let allDone: String?
  let subgroupShort: String?
  let description: String?
  let now: String?
  let next: String?
}

struct WidgetSnapshot: Codable {
  let groupName: String
  let generatedAt: String
  let currentWeek: Int
  let subgroup: Int
  let today: WidgetDayBlock
  let nextDay: WidgetDayBlock?
  let upcoming: WidgetUpcoming?
  let strings: WidgetStrings?
}
