# Локальная разработка с Trae AI и Railway

Этот документ описывает, как настроить локальную среду разработки в Trae AI, используя удалённую MongoDB на Railway и как быстро публиковать обновления.

## Требования
- Node.js >= 16
- npm >= 8
- Git
- (опционально) Railway CLI и авторизация: `railway login`

## 1. Клонирование и установка
```bash
git clone https://github.com/johnny4irish/project-bartender.git
cd project-bartender
npm install
cd client && npm install && cd ..
```

## 2. Настройка окружения
Создайте файлы переменных окружения:

- Корень проекта: `.env`
```
MONGODB_URI=mongodb://mongo:mmbccaUNRtKkqXsTuJDSNepNJebtyTXt@metro.proxy.rlwy.net:25358/test?authSource=admin
JWT_SECRET=dev-secret-change-me
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
SESSION_SECRET=dev-session-secret-change-me
```

- Фронтенд: `client/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Примечание: `MONGODB_URI` указывает на удалённую MongoDB Railway (`metro.proxy.rlwy.net:25358`).

## 3. Запуск в режиме разработки
В Trae AI откройте терминал в корне проекта и выполните:
```bash
npm run dev:all
```
Это запустит одновременно:
- Backend (`http://localhost:5000`)
- Frontend (`http://localhost:3000`)

Фронтенд проксирует запросы `/api/*` на `NEXT_PUBLIC_API_URL`.

## 4. Быстрый деплой обновлений
Есть два способа:

### Вариант A: Railway CLI из локальной машины
1. В корне проекта выполните:
   ```bash
   npm run link:railway   # привязка к проекту Railway (однократно)
   npm run status:railway # проверка статуса
   npm run deploy:railway # быстрая публикация текущего состояния
   ```
2. Требуется установленный Railway CLI и авторизация.

### Вариант B: Автодеплой через GitHub
Если репозиторий уже подключен к Railway, пуш в ветку `main` автоматически запустит сборку и деплой (Nixpacks). Убедитесь, что переменные окружения настроены в Railway.

## 5. Переменные окружения
Backend использует `MONGODB_URI` (в `config/db.js`). При наличии переменной подключается к MongoDB, иначе падает обратно на файловое хранилище.

## 6. Полезные команды
```bash
npm run dev         # только backend
cd client && npm run dev  # только frontend
npm run dev:all     # оба сервиса одновременно
npm run deploy:railway     # быстрый деплой через Railway CLI
```

## 7. Диагностика
- Проверка здоровья сервера: `GET http://localhost:5000/api/health`
- Проверка JWT-конфигурации: `GET http://localhost:5000/api/debug/jwt`

## 8. Безопасность
- Не коммитьте реальные секреты в репозиторий
- Для CI-деплоя добавьте секрет `RAILWAY_TOKEN` в GitHub → Settings → Secrets → Actions

---
Готово! Локальная разработка использует удалённую MongoDB, а деплой выполняется одной командой.