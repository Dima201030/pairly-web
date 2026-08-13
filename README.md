# Pairly Web

Web-версия Pairly (Next.js App Router). Планировщик матчей и турниров: заявки на игры, чаты участников, модерация.

## Разработка

```bash
npm run dev     # http://localhost:3000
npm run build   # продакшн-сборка
npm run lint    # eslint
```

## Аутентификация и профиль (важно)

Firestore-правила (`firestore.rules` в проекте iOS) запрещают **создавать** профиль
в `users/{uid}`, если в документе есть поле `role` (защита от само-эскалации роли):

```
allow create: if isSignedIn() && request.auth.uid == userId && !('role' in request.resource.data)
```

Поэтому `src/lib/AuthContext.tsx`:
- `register` и `updateProfile` никогда не отправляют в док `role`/`blocked` — эти поля
  серверно-контролируемые (назначаются только через модерацию).
- Если док так и не создался (аккаунты до фикса), `createMissingProfile` при входе
  самовосстанавливает минимальный профиль БЕЗ `role`.
- Локально `setProfile` отражает `role` сразу, чтобы UI видел права до записи в БД.

Роли в приложении: `user`, `moderator`, `support`, `host`. Меняются только через
`ModerationTab` (прямой `updateDoc`), не через профиль пользователя.

## Брендовые цвета (синий + зелёный)

Дизайн-токены в `src/app/globals.css`:

- `--color-brand*` — **синий** `#0096FF`, основной цвет действий (кнопки, активное, фокус).
- `--color-brand-green*` — **зелёный** `#00D4AA`, акцент (вторичные кнопки, «открыто», positive).
- `brand-gradient` / `brand-gradient-text` — сине-зелёный градиент для брендовых моментов
  (логотип, активные табы, подсветка).
- `pill-active`, `.btn-brand-gradient`, `.btn-primary` (синий), `.btn-secondary` (зелёный).

## Структура

- `src/app/page.tsx` — лента с табами; вкладки не размаунтятся (hidden), live-подписки живут.
- `src/app/login/page.tsx` — вход/регистрация.
- `src/components/tabs/` — Матчи, Заявка, Турниры, Модерация, Профиль.
- `src/lib/AuthContext.tsx` — Firebase Auth + подписка на профиль + join-транзакции.
- `src/lib/firebase.ts` — конфиг Firebase (env с фолбэками).
