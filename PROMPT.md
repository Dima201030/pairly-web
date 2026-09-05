# Pairly for AI — Начальный промт

Используй этот промт в начале каждого нового чата с нейросетью.

---

## Промт:

```
Ты работаешь над проектом Pairly Web — планировщик матчей и турниров для совместных спортивных игр.

## Сервер
- SSH: dima@192.168.0.200
- Пароль: 1413Dima.102956
- Проект на сервере: /home/dima/pairly-web
- PM2 процесс: pairly-web
- Деплой: rsync → npm install → npm run build → pm2 restart pairly-web

## Правила работы
1. Каждое действие логируй — что делал, почему, что изменилось.
2. Перед изменениями читай существующий код. Не перезаписывай без понимания контекста.
3. Не ломай бизнес-логику. Визуал и UX — да, архитектура и data model — только если критично.
4. После каждого significant change делай build (npm run build) и проверяй ошибки.
5. После готовности — деплой на сервер: rsync → build → pm2 restart.
6. Веди список всех изменений в конце сессии.

## Стек
- Next.js 16 (App Router), React 19, TypeScript
- Firebase (Auth + Firestore + Storage)
- Tailwind CSS 4
- Yandex Maps API

## Design System (Kinetic Sport)
- Dark glass aesthetic: deep blue-black base (#080c12)
- Teal accent (#00D4AA) — primary actions
- Amber highlight (#FFB547) — secondary
- Instrument Sans — единственный шрифт
- Glass surfaces: backdrop-filter blur(20px)
- Consistent radius: 8-24px
- Token-based: все значения через CSS custom properties

## Структура проекта
- src/app/page.tsx — главная (табы)
- src/app/login/page.tsx — авторизация
- src/components/tabs/ — MatchesTab, CreateMatchTab, TournamentsTab, ModerationTab, ProfileTab
- src/components/panels/ — MatchDetailPanel, TournamentDetailPanel, SupportChatPanel
- src/components/ui/ — Toast, Modal, EmptyState, YandexMap
- src/lib/ — AuthContext, firebase, types, theme, format

## Firestore коллекции
users, matches, tournaments, venues, cities, supportChats
- matches/{id}/messages — чат матча
- supportChats/{id}/supportMessages — чат поддержки

## Роли
user, moderator, support, host
- role/blocked — серверно-контролируемые (нельзя создать через профиль)

## Важно
- Не используй Inter, Roboto, Montserrat как display шрифт
- Не делай generic AI SaaS дизайн
- Все кнопки, badges, pills следуют design system токенам
- Accessibility: labels для inputs, focus-visible, semantic HTML
```

---

## Как использовать

1. Открой новый чат с нейросетью
2. Скопируй весь блок выше (от "Ты работаешь" до "semantic HTML")
3. Вставь первым сообщением
4. Начинай работу — нейросеть будет знать контекст проекта, сервер, правила и design system
