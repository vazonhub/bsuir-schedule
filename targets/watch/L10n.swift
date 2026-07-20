import Foundation

/// Watch-only strings (fallback / status screens). Day names, month names and
/// schedule labels arrive already-localized inside the snapshot; only these few
/// UI strings live on the watch. Keyed by the snapshot `locale` so the watch UI
/// follows the language chosen in the phone app, not the watch system language.
enum L10n {
  struct Strings {
    let openOnPhoneTitle: String
    let openOnPhoneSubtitle: String
    let loading: String
    let errorTitle: String
    let retry: String
    let updatedJustNow: String
    /// Format with a localized relative time, e.g. "обновлено 2 дн. назад".
    let updatedAgoFormat: String
    let daysWord: String
    // Picker (watch-side group/teacher switching).
    let pickTitle: String
    let pickGroup: String
    let pickTeacher: String
    let searchGroupPrompt: String
    let searchTeacherPrompt: String
    let chooseButton: String
    let backToPinned: String
    let recent: String
    let searching: String
    let nothingFound: String
  }

  static func strings(for locale: String) -> Strings {
    switch locale {
    case "en":
      return Strings(
        openOnPhoneTitle: "Open Bsuir Time on iPhone",
        openOnPhoneSubtitle: "Pin a group in the app to see your schedule on the watch.",
        loading: "Loading…",
        errorTitle: "Couldn't load",
        retry: "Retry",
        updatedJustNow: "updated just now",
        updatedAgoFormat: "updated %@ ago",
        daysWord: "d",
        pickTitle: "Schedule",
        pickGroup: "Group",
        pickTeacher: "Teacher",
        searchGroupPrompt: "Group number",
        searchTeacherPrompt: "Last name",
        chooseButton: "Choose a group",
        backToPinned: "Pinned group",
        recent: "Recent",
        searching: "Searching…",
        nothingFound: "Nothing found"
      )
    case "be":
      return Strings(
        openOnPhoneTitle: "Адкрыйце Bsuir Time на iPhone",
        openOnPhoneSubtitle: "Замацуйце групу ў дадатку, каб бачыць расклад на гадзінніку.",
        loading: "Загрузка…",
        errorTitle: "Не атрымалася загрузіць",
        retry: "Паўтарыць",
        updatedJustNow: "абноўлена толькі што",
        updatedAgoFormat: "абноўлена %@ таму",
        daysWord: "дз",
        pickTitle: "Расклад",
        pickGroup: "Група",
        pickTeacher: "Выклад.",
        searchGroupPrompt: "Нумар групы",
        searchTeacherPrompt: "Прозвішча",
        chooseButton: "Выбраць групу",
        backToPinned: "Замацаваная група",
        recent: "Нядаўнія",
        searching: "Пошук…",
        nothingFound: "Нічога не знойдзена"
      )
    default: // ru
      return Strings(
        openOnPhoneTitle: "Откройте Bsuir Time на iPhone",
        openOnPhoneSubtitle: "Закрепите группу в приложении, чтобы видеть расписание на часах.",
        loading: "Загрузка…",
        errorTitle: "Не удалось загрузить",
        retry: "Повторить",
        updatedJustNow: "обновлено только что",
        updatedAgoFormat: "обновлено %@ назад",
        daysWord: "дн",
        pickTitle: "Расписание",
        pickGroup: "Группа",
        pickTeacher: "Препод.",
        searchGroupPrompt: "Номер группы",
        searchTeacherPrompt: "Фамилия",
        chooseButton: "Выбрать группу",
        backToPinned: "Закреплённая группа",
        recent: "Недавние",
        searching: "Поиск…",
        nothingFound: "Ничего не найдено"
      )
    }
  }
}
