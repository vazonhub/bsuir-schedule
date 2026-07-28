import SwiftUI

/// Full details for a single lesson.
struct LessonDetailView: View {
  let lesson: WatchLesson
  let snapshot: WatchSnapshot

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 10) {
        Text(lesson.subject)
          .font(.headline)

        HStack(spacing: 6) {
          Circle()
            .fill(Color(hex: lesson.typeColorHex))
            .frame(width: 8, height: 8)
          if let type = lesson.typeAbbrev, !type.isEmpty {
            Text(type).font(.caption)
          }
          Text("\(lesson.startTime)–\(lesson.endTime)")
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        if !lesson.auditories.isEmpty {
          row(icon: "mappin.and.ellipse", text: lesson.auditories.joined(separator: ", "))
        }
        if let teacher = lesson.teacher, !teacher.isEmpty {
          row(icon: "person.fill", text: teacher)
        }
        if lesson.numSubgroup != 0 {
          row(
            icon: "person.2.fill",
            text: "\(snapshot.strings.subgroupShort) \(lesson.numSubgroup)")
        }
        if let note = lesson.note, !note.isEmpty {
          row(icon: "note.text", text: note)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.horizontal, 4)
    }
  }

  private func row(icon: String, text: String) -> some View {
    HStack(alignment: .top, spacing: 8) {
      Image(systemName: icon)
        .font(.caption)
        .foregroundStyle(.secondary)
        .frame(width: 16)
      Text(text)
        .font(.footnote)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}
