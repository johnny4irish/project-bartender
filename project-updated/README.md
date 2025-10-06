# Project Bartender 🍸

Система управления баром с геймификацией для бармена. Включает в себя управление продажами, систему баллов, магазин призов и административную панель.

## 🚀 Возможности

### Для Бармена
- **Продажи**: Добавление и отслеживание продаж с загрузкой чеков
- **Геймификация**: Система баллов за продажи
- **Магазин призов**: Обмен баллов на призы
- **Корзина**: Управление выбранными призами
- **Профиль**: Просмотр статистики и достижений

### Для Администратора
- **Управление пользователями**: Создание, редактирование, управление ролями
- **Управление продуктами**: Добавление товаров, брендов, категорий
- **Управление призами**: Создание и редактирование призов
- **Аналитика**: Статистика продаж и активности пользователей
- **Заказы**: Управление заказами призов

## 🛠 Технологии

### Backend
- **Node.js** + **Express.js**
- **MongoDB** с **Mongoose**
- **JWT** аутентификация
- **Multer** для загрузки файлов
- **bcryptjs** для хеширования паролей

### Frontend
- **Next.js** (React)
- **Tailwind CSS** для стилизации
- **Axios** для API запросов
- **shadcn/ui** компоненты

## 📦 Установка и запуск

### Предварительные требования
- Node.js (версия 16 или выше)
- MongoDB (локально или MongoDB Atlas)
- npm или yarn

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd project-bartender
```

### 2. Установка зависимостей

#### Backend
```bash
npm install
```

#### Frontend
```bash
cd client
npm install
cd ..
```

### 3. Настройка переменных окружения

Создайте файл `.env` в корневой папке:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/bartender
# или для MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bartender

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Server
PORT=5000
NODE_ENV=development

# Client URL (для CORS)
CLIENT_URL=http://localhost:3000
```

### 4. Запуск приложения

#### Режим разработки

Терминал 1 (Backend):
```bash
npm run dev
```

Терминал 2 (Frontend):
```bash
cd client
npm run dev
```

#### Продакшен
```bash
# Backend
npm start

# Frontend (в отдельном терминале)
cd client
npm run build
npm start
```

## 🌐 Развертывание в продакшене

### Backend (Railway/Render)
1. Создайте аккаунт на [Railway](https://railway.app) или [Render](https://render.com)
2. Подключите GitHub репозиторий
3. Настройте переменные окружения:
   - `MONGODB_URI` (MongoDB Atlas)
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `CLIENT_URL` (URL фронтенда)

### Frontend (Vercel/Netlify)
1. Создайте аккаунт на [Vercel](https://vercel.com) или [Netlify](https://netlify.com)
2. Подключите GitHub репозиторий
3. Настройте build settings:
   - Build command: `npm run build`
   - Output directory: `.next`
   - Root directory: `client`

### База данных (MongoDB Atlas)
1. Создайте кластер на [MongoDB Atlas](https://cloud.mongodb.com)
2. Настройте сетевой доступ (IP Whitelist)
3. Создайте пользователя базы данных
4. Получите строку подключения

## 📁 Структура проекта

```
project-bartender/
├── client/                 # Next.js фронтенд
│   ├── pages/             # Страницы приложения
│   ├── components/        # React компоненты
│   └── styles/           # CSS стили
├── models/               # MongoDB модели
├── routes/              # Express маршруты
├── middleware/          # Middleware функции
├── config/             # Конфигурация
├── uploads/           # Загруженные файлы
└── utils/            # Утилиты
```

## 🔐 Роли пользователей

### Администратор
- Полный доступ ко всем функциям
- Управление пользователями и контентом
- Просмотр аналитики

### Бармен
- Добавление продаж
- Участие в системе геймификации
- Обмен баллов на призы

## 🎯 Система баллов

- **1 балл** = **1 рубль** продаж
- Баллы начисляются автоматически при добавлении продаж
- Баллы можно обменять на призы в магазине
- История транзакций сохраняется

## 📱 API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/user` - Получение данных пользователя

### Продажи
- `GET /api/sales` - Список продаж
- `POST /api/sales` - Добавление продажи
- `PUT /api/sales/:id` - Обновление продажи
- `DELETE /api/sales/:id` - Удаление продажи

### Геймификация
- `GET /api/gamification/prizes` - Список призов
- `GET /api/gamification/cart` - Корзина пользователя
- `POST /api/gamification/cart/add` - Добавить в корзину
- `POST /api/gamification/cart/checkout` - Оформить заказ

### Администрирование
- `GET /api/admin/users` - Список пользователей
- `POST /api/admin/users` - Создание пользователя
- `GET /api/admin/stats` - Статистика

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License.

## 📞 Поддержка

Если у вас есть вопросы или проблемы, создайте issue в репозитории.

---

**Сделано с ❤️ для барменов**