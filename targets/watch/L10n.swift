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
        daysWord: "d"
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
        daysWord: "дз"
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
        daysWord: "дн"
      )
    }
  }
}
