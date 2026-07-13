# bsuir-auditory-api

Тонкий сервис поверх публичного API iis.bsuir.by, который отвечает на вопрос «свободна ли аудитория сейчас и когда освободится».

## Как оно устроено

```
┌─────────────────────┐     nightly     ┌──────────────────────┐
│ GitHub Actions cron │───────────────▶│  Cloudflare Worker    │
│  services/auditory- │  POST /index    │  + KV (bsuir-auditory │
│  api/src/crawler.ts │  (Bearer auth)  │  -api)                │
└─────────────────────┘                 └──────────────────────┘
                                                 │  GET /index
                                                 ▼
                                        ┌──────────────────────┐
                                        │  Mobile app (RN)     │
                                        │  fetches once/day    │
                                        │  computes status     │
                                        │  локально            │
                                        └──────────────────────┘
```

Cloudflare Worker сам ничего не краулит — на free tier у него лимит **50
subrequests per invocation**, а групп в БГУИР ~1500. Поэтому краулит GitHub
Action (у него таких лимитов нет), а Worker только раздаёт готовый JSON из KV.

## Endpoints

| Метод | Путь      | Что делает                                             |
|-------|-----------|--------------------------------------------------------|
| GET   | `/`       | healthcheck                                            |
| GET   | `/index`  | полный индекс `{ auditory → day → slots[] }` (~200 KB) |
| GET   | `/meta`   | только метаданные (когда обновлялось, сколько аудиторий) |
| POST  | `/index`  | принимает свежий индекс от crawler'а (Bearer auth)     |

Ответ `/index` кэшируется на CDN на 1ч, поэтому реальные KV read'ы почти не тратятся.

## Одноразовая настройка (10 минут)

### 1. Cloudflare

1. Зарегистрируй бесплатный аккаунт на https://dash.cloudflare.com (кредитка не нужна).
2. Установи wrangler и залогинься:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
3. Из этой папки:
   ```bash
   cd services/auditory-api
   npm install
   wrangler kv namespace create AUDITORY_KV
   ```
   Скопируй `id`, который выведет команда, и вставь в `wrangler.toml`
   вместо `REPLACE_ME_WITH_KV_NAMESPACE_ID`.
4. Сгенерируй случайный токен и положи как секрет Worker'а:
   ```bash
   # где-нибудь: openssl rand -hex 32  → скопируй результат
   wrangler secret put CRAWL_TOKEN
   # вставь тот же токен, когда спросит
   ```
5. Деплой:
   ```bash
   npm run deploy
   ```
   В выводе будет URL вида `https://bsuir-auditory-api.<твой-subdomain>.workers.dev`.
   Сохрани его.

### 2. GitHub Actions

В настройках репозитория → Settings → Secrets and variables → Actions → New repository secret,
добавь два секрета:

- `AUDITORY_WORKER_URL` — URL из шага 5 выше (без слеша в конце)
- `AUDITORY_CRAWL_TOKEN` — тот же токен из шага 4

Первый прогон запусти вручную: Actions → «Crawl auditory occupancy» → Run workflow.
Дальше он сам будет запускаться ночью в 00:00 UTC (03:00 Минск).

### 3. Мобильное приложение

В `app.json` (уже сделано в этой ветке) в `expo.extra` добавлен ключ
`auditoryApiUrl` — впиши туда URL из шага 5.

Всё. Дальше приложение раз в 24ч скачивает свежий индекс и держит его в
AsyncStorage. Модалка пары показывает статус мгновенно, без сетевых запросов.

## Стоимость

Всё бесплатно:

- Cloudflare Workers free: 100k запросов/день, 100k KV reads/день (мы упираемся в это только при десятках тысяч пользователей)
- Cloudflare KV free: 1000 writes/день (нам нужно 2 в сутки)
- GitHub Actions: 2000 минут/мес на приватных репо, бесконечно на публичных. Один прогон ~5 минут.

## Локальная разработка

```bash
# Полный прогон краулера локально (нужен .env с WORKER_URL и CRAWL_TOKEN):
MAX_GROUPS=20 npm run crawl        # быстрый тест на 20 группах

# Локальный Worker:
npm run dev

# Type-check:
npm run typecheck
```
