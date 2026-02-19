# Chat + Supabase data viewer

## 1) Установка

```bash
npm install
npm run dev
```

Если `npm install` падает с `403 Forbidden`, обычно это из-за корпоративного proxy / приватного registry.
Проверьте:

```bash
npm config get registry
npm config delete proxy
npm config delete https-proxy
npm config set registry https://registry.npmjs.org/
```

И перезапустите установку. Если у вас корпоративная сеть — используйте ваш внутренний npm registry.

## 2) Куда вставлять ключи

Скопируйте `.env.example` -> `.env.local` и заполните:

- `POLZA_API_KEY` — ключ Polza.ai
- `POLZA_MODEL` — модель, например `gpt-4o-mini`
- `SUPABASE_URL` — URL проекта Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — **только server-side**, не отдавать на клиент

## 3) Другие настройки

- API роут: `app/api/chat/stream/route.ts`
- Клиентский UI: `app/chat/page.tsx` + `components/*`
- Supabase admin client (service-role): `lib/supabaseAdmin.ts`
- Polza client: `lib/polzaClient.ts`

## 4) SQL для Supabase (память)

Готовый SQL для таблицы памяти:

- `supabase/memory.sql`

Вставьте этот файл в Supabase SQL Editor и выполните.

## 5) Примеры запросов

- `покажи таблицу leads последние 10`
- `выгрузи колонки id,name,status из таблицы leads`
