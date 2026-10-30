# Удаление рекламного идентификатора из сторов (после релиза v3.3.0)

Начиная с **v3.3.0** приложение полностью без рекламы: убран Unity Ads SDK, рекламный
идентификатор (iOS IDFA / Android Advertising ID) и все SDK-декларации в коде
(`SKAdNetworkItems`, permission `com.google.android.gms.permission.AD_ID`).

> ⚠️ **Порядок важен.** Декларации в сторах должны совпадать с тем, что реально в
> бинарнике. Меняйте их **только после того, как новая версия (3.3.0) загружена и
> раскатана во все активные треки** — иначе сторы покажут предупреждение о
> несоответствии (в сторе ещё висит старый билд с рекламным идентификатором).

---

## 📱 App Store Connect (iOS)

1. **App Privacy** (Конфиденциальность приложения)
   - App Store Connect → приложение → вкладка **App Privacy** → **Edit**.
   - Удалить типы данных, которые собирались ради рекламы — обычно
     **Identifiers → Device ID** и всё, что помечено целью
     **Third-Party Advertising** / **Developer's Advertising or Marketing**.
   - Если после удаления не осталось ни одного собираемого типа данных — выбрать
     **«Data Not Collected»**.

2. **IDFA (Advertising Identifier)**
   - При сабмите версии 3.3.0 в разделе **Advertising Identifier (IDFA)** ответить
     **«No, this app does not use the Advertising Identifier (IDFA)»**.
   - Раньше, вероятно, стояло «Yes» — обязательно переключить на «No», иначе ревью
     отклонят за несоответствие (SDK рекламы в бинарнике больше нет).

3. Сохранить. App Privacy публикуется сразу; IDFA-декларация привязана к версии при
   сабмите.

---

## 🤖 Google Play Console (Android)

1. **Advertising ID**
   - Play Console → приложение → **Policy and programs → App content**
     (Политики → Контент приложения) → раздел **Advertising ID**.
   - Так как `AD_ID` переведён в `blockedPermissions` (его нет в манифесте 3.3.0),
     сменить ответ на **«No, my app doesn't use advertising ID»**.
   - ⚠️ Play покажет предупреждение, если декларация говорит «не используется», а в
     каком-либо активном треке (прод/тест) ещё висит старый APK/AAB с permission
     `AD_ID`. Поэтому сначала раскатать 3.3.0 во **все** активные треки, затем менять
     декларацию.

2. **Data safety** (Безопасность данных)
   - Там же в **App content → Data safety** убрать пункты про рекламу: сбор
     **Device or other IDs** с целью **Advertising or marketing**, а также упоминания
     сторонних рекламных партнёров.

3. Отправить форму на проверку (Submit / Save).

---

## ✅ Проверка после публикации

- **iOS:** установить релизную версию — приложение не запрашивает трекинг и работает
  без рекламы.
- **Android:** после полной раскатки 3.3.0 во все треки декларация Advertising ID = No
  сохраняется без предупреждений.

---

## Что уже сделано в коде (для справки)

- Удалён пакет `@mrnitrox/react-native-unity-ads-monetization` и плагин
  `withUnityBanner`.
- iOS: удалён список `SKAdNetworkItems` из `app.json → ios.infoPlist`.
- Android: `com.google.android.gms.permission.AD_ID` перенесён в
  `android.blockedPermissions` (Expo добавит `tools:node="remove"` в манифест, чтобы
  транзитивные зависимости не вернули его).
- Удалены env-переменные `EXPO_PUBLIC_UNITY_*`.
