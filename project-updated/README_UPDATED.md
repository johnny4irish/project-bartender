# Модернизированная копия проекта (project-updated)

Эта папка содержит копию текущего проекта с начатой миграцией на Next.js App Router, добавлением middleware и централизацией авторизации.

## Запуск

1. Перейдите в папку `project-updated/client`.
2. Установите зависимости: `npm install` (при необходимости).
3. Запустите dev-сервер: `npm run dev`.

> Примечание: для полноценной работы middleware нужно перенести авторизационные токены в cookies (httpOnly) вместо `localStorage`. Пока middleware является каркасом.

## Что сделано

- Создан каркас App Router: `app/` с `layout.js`, `providers.jsx`, `page.js`, `app/admin/page.js`.
- Добавлен `middleware.js` для централизованной проверки токена/ролей.
- Добавлены HOC-обёртки `withAuth` и `withRole` для централизованного контроля доступа в Pages Router.
- Частично применены HOC к страницам (`admin/index.js`, `sales/index.js`).

## План миграции

- Перенести защищённые страницы в `app/*` со Server Components и Server Actions.
- Интегрировать `next-auth` или иную систему JWT с httpOnly cookies.
- Постепенно убрать проверки токена из отдельных страниц, полагаясь на middleware/HOC.
- Добавить `loading.js` и `error.js` в ключевые роуты, включить ISR/SSG (`export const revalidate`).