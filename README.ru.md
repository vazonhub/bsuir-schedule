<div align="center">
  <img src="assets/icon.png" width="96" alt="Иконка Bsuir Time" />

# Bsuir Time

### Расписание БГУИР, которое ощущается нативным — с виджетами, дневником, огоньком и облачной синхронизацией

[English](README.md) · **Русский**

![Expo](https://img.shields.io/badge/Expo_SDK-57%2B-000020)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=white)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Платформы](https://img.shields.io/badge/platforms-iOS%2015.1%2B%20%7C%20Android-8E8E93)](#getting-started)
![Лицензия: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

[<img src="https://img.shields.io/badge/App%20Store-Bsuir%20Time-0D96F6?logo=apple&logoColor=white" alt="Скачать в App Store" />](https://apps.apple.com/by/app/bsuir-time/id6762343557)
[<img src="https://img.shields.io/badge/Google%20Play-Bsuir%20Time-34A853?logo=googleplay&logoColor=white" alt="Скачать в Google Play" />](https://play.google.com/store/apps/details?id=by.vazon.bsuirtime)

</div>

---

<!-- screenshots:start -->
<div align="center">
  <img src="docs/screenshots/my.png" width="24%" alt="Моё расписание" />
  <img src="docs/screenshots/diary.png" width="24%" alt="Дневник" />
  <img src="docs/screenshots/widgets.png" width="24%" alt="Виджеты" />
  <img src="docs/screenshots/appearance.png" width="24%" alt="Внешний вид" />
</div>
<!-- screenshots:end -->

## Возможности

- 📅 **Расписание групп и преподавателей** — 4-недельный цикл БГУИР,
  автоскролл к текущей паре, живой прогресс идущей пары, экзамены и
  разовые объявления.
- 🔎 **Умный поиск** — устойчив к опечаткам, цифровые сокращения для групп
  (`410` → все подходящие группы), многословный поиск преподавателей.
- 📌 **Закрепление групп и преподавателей** — фоновая предзагрузка, подгруппа
  для каждой сущности, скрытие прошедших пар, блокировка отдельных пар.
- 🚪 **Занятость аудиторий** — свободна ли аудитория сейчас и до какого
  времени; работает на собственном [Cloudflare Worker](services/auditory-api/).
- 📓 **Дневник и планер** — сетки заданий по предметам, drag-and-drop планер,
  статистика прогресса.
- 🔥 **Огонёк** — ежедневная серия активности с заморозками, вехи 7/30/100,
  календарь активности и вечернее напоминание.
- 🧩 **Виджеты на Home и Lock Screen** — WidgetKit на iOS (включая экран
  блокировки) и Glance-виджеты на Android, с deep link'ами в приложение.
- ☁️ **Облачная синхронизация** — iCloud на iOS, Google Drive на Android;
  offline-first с кэшем расписаний как резервным источником.
- 🎨 **Персонализация** — светлая/тёмная темы, свои цвета типов пар, замена
  иконок-слотов и **24 альтернативные иконки приложения**.
- 🌍 **Локализация** — русский, беларуская, English.
- 🇧🇾 **Государственные праздники РБ** из коробки, плюс собственные выходные.
- ♿ **Доступность** — уменьшение движения, высокий контраст, режим
  «различать не только цветом».
- ✨ **Нативность** — настоящий `UITabBarController`, Liquid Glass на iOS 26+
  с graceful fallback, хаптика, skeleton-загрузка.

> Приложению не нужен собственный бэкенд — все данные расписания приходят из
> публичного API БГУИР (`iis.bsuir.by/api/v1`).

## Быстрый старт

Требуется: Node.js 20+, Xcode (iOS) или Android Studio + JDK 17 (Android).

```bash
git clone https://github.com/vazonhub/bsuir-schedule.git
cd bsuir-schedule
npm install
cp .env.example .env   # все переменные опциональны

npm run ios            # или: npm run android
```

> **Expo Go не подойдёт** — нативные табы требуют dev client, который
> `npm run ios` / `npm run android` собирает автоматически.

Все переменные окружения опциональны: фичи, которым они нужны (Unity Ads,
синк через Google Drive, статус аудиторий, EAS-сборки), просто остаются
выключенными. См. [`.env.example`](.env.example).

## Архитектура

Строгие MVC-слои поверх Expo Router 6:

```
app/                  file-based роуты (тонкие re-export'ы views)
src/
├── models/dto/       DTO-типы под iis.bsuir.by/api/v1
├── services/api/     axios-обёртки — единственное место с HTTP
├── stores/           Zustand-сторы (in-memory state)
├── controllers/      оркестрация API → нормализация → store
├── views/            экраны (методы контроллеров + селекторы сторов)
├── components/       переиспользуемый UI без бизнес-логики
├── widgets/          UI Android-виджетов
└── theme/ utils/ …   дизайн-токены и хелперы
targets/              нативный iOS-виджет (WidgetKit) и Unity-баннер
plugins/              Expo config-плагины (виджеты, StoreKit, иконки, …)
services/auditory-api Cloudflare Worker + краулер занятости аудиторий
```

Детали и правила — в [CONTRIBUTING.md](CONTRIBUTING.md).

## Участие

Issues и PR приветствуются — сборка, архитектурные правила и конвенции
коммитов описаны в [CONTRIBUTING.md](CONTRIBUTING.md).

## Ссылки

- 📖 [Гайд пользователя](https://dorian-camera-fc6.notion.site/Bsuir-Time-34ba9d552bd8800e8008d333dace4ada)
- 🔒 [Политика конфиденциальности](https://dorian-camera-fc6.notion.site/Privacy-Policy-for-Bsuir-Time-344a9d552bd880c79b77cd8a6605e653)
- 💬 [Telegram](https://t.me/multibelbet)

## Лицензия

[MIT](LICENSE) © Konstantsin Betenya

---

<div align="center">
Если Bsuir Time спасает твои утра — поставь ⭐ репозиторию, это правда помогает!
</div>
