# CLAUDE.md

Context for Claude Code (and for developers). Loaded automatically when working in this directory.

## About the project

"Bsuir Time" — a BSUIR class schedule mobile app. Stack: Expo SDK 57 + React Native 0.81 + TypeScript (strict). See [README.md](README.md) for the feature overview and [CONTRIBUTING.md](CONTRIBUTING.md) for the contributor guide.

**Platforms:**

- **iOS** — primary. Minimum target — iOS 15.1. Liquid Glass / native large title — iOS 26+ only (with graceful fallback on older versions).
- **Android** — full feature support, but UI is designed iOS-first and then adapted to Material 3. Home Screen widgets ship on both platforms (WidgetKit + Glance-style).

## Architecture — MVC

Strict layering. Do not break it without prior discussion.

- `src/models/dto/*` — DTO types for `iis.bsuir.by/api/v1` responses.
- `src/services/api/*` — axios wrappers. HTTP requests happen **only** here.
- `src/stores/*` — Zustand stores (in-memory state).
- `src/controllers/*` — orchestration: API → normalization → store. The **only** place where the view layer meets services.
- `src/views/*` — screens (call controller methods only, read stores via selectors).
- `src/components/*` — reusable UI without business logic.
- `app/*` — file-based routing, **Expo Router 6** (native tab bar via `expo-router/unstable-native-tabs`). Structure: `app/(tabs)/{(groups)|(employees)}/{_layout,index,[name|urlId]}.tsx`. Every route file is a thin re-export of the matching component from `@views/*`.
- `src/theme/*`, `src/utils/*`, `src/hooks/*` — supporting code.

### Hard rules

- Never call axios from view components.
- Never hardcode lesson colors in components — use `getLessonAccentColor` from `@utils/lesson`.
- Never edit files in `ios/` / `android/` by hand if they appear after `expo prebuild` — all native configuration goes through `app.json` and Expo config plugins.

## Import aliases

`@/`, `@models/`, `@views/`, `@controllers/`, `@services/`, `@stores/`, `@components/`, `@navigation/`, `@theme/`, `@utils/`, `@hooks/`.

Source of truth: `tsconfig.json` + `babel.config.js` (`module-resolver`). Change both in sync.

## Lesson type colors

Canon lives in `src/theme/colors.ts → LESSON_TYPE_COLORS`.

## Commands

- `npm run ios` — Metro + iOS simulator (needs a dev client, not Expo Go).
- `npm run typecheck` — `tsc --noEmit`.
- `npm run lint` / `npm run lint:fix`.
- `npm run format` / `npm run format:check` — Prettier.
- `npm run bump:patch|minor|major` — bump the version in package.json (the version's source of truth).
- `npm run prebuild` — regenerate `ios/` and `android/` (after changing plugins or native dependencies).

The pre-commit hook (husky + lint-staged) runs prettier + `eslint --fix` on staged files automatically.

## Git flow and CI/CD

Full model — `docs/plans/CICD_PLAN.md`, release checklist — `RELEASE.md`. In short:

- **`develop`** — default branch, all development. Feature branches `feature/*`, `fix/*` — branch off it, PR back into it.
- **`testing`** — PR `develop → testing` titled `Release vX.Y.Z` (CI checks the version against package.json). After merge — automatic EAS build + submit for both platforms (iOS → TestFlight, Android → Internal testing). A `[ios]`/`[android]` tag in the merge commit limits the build to one platform.
- **`master`** — releases only. PR `testing → master` with the same title. After merge — automatically: git tag, production APK, GitHub Release. Store publication is manual (promotion of the testing builds).
- CI (`.github/workflows/ci.yml`) on every PR: prettier, eslint (`--max-warnings 0`), tsc, tests (`--if-present`).

## Environment variables

Owner-specific identifiers (EAS owner/projectId, auditory API URL, Unity Ads IDs, Google client ID) are **not** committed — they come from `.env` via `app.config.ts`. See `.env.example`; every variable is optional and the related feature silently disables when unset.

## Running on a device

`expo-router/unstable-native-tabs` uses a native `UITabBarController` → **Expo Go won't work**; a dev client is required (`expo-dev-client` is already installed):

```bash
npx expo run:ios     # Mac + Xcode, installs the dev client + starts Metro
# or, for an already-built client:
npx expo start --dev-client
```

Symptom of "Expo Go instead of dev client": runtime error `<RNCTabView> Unimplemented component`.

## Project docs

Historical design/plan documents live in `docs/plans/` (kept as an archive; they are not up-to-date specs). Current work is tracked in GitHub issues.

## Established product decisions

- Group list — `SectionList`, grouped by faculty with sticky headers ("ФКСиС · …"). Within a section — sorted by course, then by name.
- Pinned groups and lecturers are prefetched in the background on app start and on `AppState → active`. See `src/services/prefetch.ts`.
- There is no separate "Today" tab. Its role is played by auto-scroll on the pinned group's schedule and by widgets.
- Home/Lock Screen widgets are mandatory functionality on both iOS and Android. The widget snapshot is produced by `src/services/widget/widgetData.ts` and written to shared storage (App Group on iOS, SharedPreferences on Android).
- **Apple Watch app** (watchOS only, iOS 15.1+ / watchOS 10+). Shows the pinned (`defaultGroup`) schedule: today + paging by days/weeks. Data flow differs from widgets because the watch is a separate device — App Group UserDefaults do **not** sync across devices:
  - Phone builds a richer `WatchSnapshot` (full 4-week window, `src/services/watch/watchData.ts`) and pushes it via **WatchConnectivity** (`updateApplicationContext`). The bridge is a local Expo module `modules/watch-bridge` (Swift `WCSession`). Same update triggers as the widget (`updateWatchSnapshot()` sits next to every `updateWidgetSnapshot()` call).
  - Watch (SwiftUI, `targets/watch/*`) caches the snapshot in its own App-Group `UserDefaults` and renders it. If the cache is stale and the phone is unreachable, it falls back to fetching the BSUIR API directly (`targets/watch/API.swift`) — a **simplified** normalization (no exams/holidays/blocked lessons).
  - The watch target is created by `plugins/withWatchApp.js` (mirrors `withWidget.js`; hand-rolled pbxproj since `ios/` is gitignored). Swift sources in `targets/watch/` are the source of truth and are copied into `ios/BsuirWatch/` on every `prebuild`. EAS build/submit + complications are deferred (see `docs/plans/WATCH_PLAN.md`).

## API notes

- Base URL: `https://iis.bsuir.by/api/v1`. HTTPS, no auth for public endpoints.
- The schedule is cyclic, **4 weeks**. Current week — `GET /schedule/current-week` (number 1..4).
- `LessonDto.weekNumber: number[]` — list of weeks. Empty array = "every week".
- `LessonDto.numSubgroup: 0|1|2` — `0` = whole-group lesson.
- `schedules` — a dictionary with **Russian** day-of-week keys (API contract; keep them Russian).
- `lessonTypeAbbrev` can be `null` — render it gray (`FALLBACK_LESSON_COLOR`).

## Code style

- TypeScript strict + `noUncheckedIndexedAccess`. Check `arr[i]` for `undefined`.
- Imports: external libraries first, then `@`-aliases, then local. Use `import type` for type-only imports.
- Components are functional, no `React.FC`. Props — a separate `interface Props`.
- Styles via `StyleSheet.create`. Colors — only from `@theme` (`Palette`), radii — `Radius`, spacing — `Spacing`. No magic numbers in styles; look for a token in `src/theme/spacing.ts` and `radius.ts`.
- Comments in English.

## Design system

- **Screen background:** `Palette.background` (#F2F2F7 / #000000 in dark).
- **Card:** `Palette.card` (#FFFFFF / #1C1C1E), corner radius `Radius.lg` (18 pt).
- **Press state:** only the card `backgroundColor` changes to `Palette.cardPressed`. No `opacity` for presses.
- **Spacing:** cards from screen edges — `Spacing.screenPadding` (12). Between cards — `Spacing.cardGap` (6). Card inner paddings — `Spacing.cardPaddingX/Y`.
- **Section header:** text has no visible background, but the wrapping `View` gets `backgroundColor: Palette.background` — so the sticky header doesn't "float" over cards.
- **Search bar:** same card style (white tile, `Radius.lg`, padding from edges = `Spacing.screenPadding`).
- **No shadows or borders** on cards by default — highlighting via background only.

## Navigation

- Between screens — `useRouter()` from `expo-router`. Push with a type-safe pathname:
  ```ts
  router.push({ pathname: '/(tabs)/(groups)/[name]', params: { name: '410101' } });
  ```
- Route params — `useLocalSearchParams<{ name: string }>()`. All values arrive as `string | string[] | undefined`; always check for `undefined`.
- Screen title — via `<Stack.Screen options={{ title: '…' }} />` inside the component, or via the stack's `_layout.tsx`.
- When adding a new screen — create a file in the right `app/(tabs)/(<tab>)/` folder and, if needed, a `Stack.Screen` entry in `_layout.tsx` (for default options).
