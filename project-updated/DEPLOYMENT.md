# Руководство по развертыванию Project Bartender

## Шаг 1: Создание GitHub репозитория

1. Создайте новый репозиторий на GitHub с названием `project-bartender`
2. Выполните следующие команды в корневой папке проекта:

```bash
# Добавить удаленный репозиторий (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/project-bartender.git

# Отправить код на GitHub
git branch -M main
git push -u origin main
```

## Шаг 2: Настройка MongoDB Atlas (База данных)

1. Зарегистрируйтесь на [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Создайте новый кластер (выберите бесплатный M0)
3. Создайте пользователя базы данных
4. Добавьте IP-адрес `0.0.0.0/0` в Network Access (для доступа из любого места)
5. Получите строку подключения (Connection String)

## Шаг 3: Развертывание бэкенда на Railway

1. Зарегистрируйтесь на [Railway](https://railway.app)
2. Создайте новый проект и подключите ваш GitHub репозиторий
3. Настройте переменные окружения:
   - `MONGODB_URI` - строка подключения к MongoDB Atlas
   - `JWT_SECRET` - секретный ключ для JWT (сгенерируйте случайную строку)
   - `NODE_ENV` - `production`
   - `PORT` - `5000`
4. Railway автоматически развернет ваш бэкенд

## Шаг 4: Развертывание фронтенда на Vercel

1. Зарегистрируйтесь на [Vercel](https://vercel.com)
2. Импортируйте ваш GitHub репозиторий
3. Установите Root Directory на `client`
4. Настройте переменные окружения:
   - `NEXT_PUBLIC_API_URL` - URL вашего бэкенда на Railway (например: `https://your-app.railway.app`)
5. Vercel автоматически развернет ваш фронтенд

## Шаг 5: Обновление конфигурации

После развертывания обновите следующие файлы:

### client/utils/api.js
```javascript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
```

### server.js (добавьте CORS для продакшена)
```javascript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
```

## Альтернативные платформы

### Для бэкенда:
- [Render](https://render.com) - бесплатная альтернатива Railway
- [Heroku](https://heroku.com) - популярная платформа (платная)

### Для фронтенда:
- [Netlify](https://netlify.com) - альтернатива Vercel
- [GitHub Pages](https://pages.github.com) - для статических сайтов

## Важные заметки

1. **Безопасность**: Никогда не коммитьте файл `.env` с реальными данными
2. **База данных**: Используйте MongoDB Atlas для продакшена
3. **Домен**: После развертывания вы получите бесплатные поддомены
4. **SSL**: Все платформы автоматически предоставляют HTTPS

## Поддержка

Если возникнут проблемы:
1. Проверьте логи на платформах хостинга
2. Убедитесь, что все переменные окружения настроены правильно
3. Проверьте, что MongoDB Atlas доступен из интернета