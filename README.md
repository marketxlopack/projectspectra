# Spectra Telegram Auth Starter (Next.js)

Готовый шаблон Next.js (TypeScript) с экраном «Войти через Telegram», загрузочным экраном и главным меню. В комплекте API-роут для проверки подписи Telegram (HMAC).

## Быстрый старт локально
```bash
npm i
npm run dev
# открыть http://localhost:3000
```

По умолчанию виджет Telegram **выключен** (эмуляция логина), чтобы всё работало в любой песочнице.

## Продакшн (Vercel)
1. Залей репозиторий на GitHub.
2. Импортируй проект в Vercel и добавь **Environment Variables**:
   - `BOT_TOKEN` — токен бота из @BotFather (секрет).
   - `NEXT_PUBLIC_BOT_USERNAME` — имя бота без @ (например, `MyCoolBot`).
   - `NEXT_PUBLIC_USE_WIDGET` — `1` чтобы включить реальный виджет.
   - (опционально) `NEXT_PUBLIC_AUTH_URL` — если хочешь изменить `/api/auth/telegram`.
3. В @BotFather сделай `/setdomain` на домен проекта (например, `https://your-app.vercel.app`).

## Важно
- Эндпоинт `/api/auth/telegram` проверяет подпись, ставит cookie и делает редирект на `/app` (можешь изменить).
- В `pages/index.tsx` флаг `USE_WIDGET` берётся из `NEXT_PUBLIC_USE_WIDGET`. Локально можешь оставить `0` и пользоваться эмуляцией.

## Структура
```
pages/
  index.tsx            # экран входа/загрузка/меню
  app.tsx              # маршрут после успешного логина (просто реюз главного меню)
  api/auth/telegram.ts # проверка подписи и редирект
```

Удачи!