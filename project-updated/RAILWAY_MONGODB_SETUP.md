# Настройка MongoDB в Railway

## Шаг 1: Создание MongoDB сервиса в Railway

1. Откройте ваш проект в Railway dashboard
2. Нажмите кнопку **"+ New"** или используйте **Ctrl/Cmd + K**
3. Выберите **"Database"** → **"Add MongoDB"**
4. Railway автоматически развернет MongoDB сервис

## Шаг 2: Получение переменных подключения

После создания MongoDB сервиса Railway автоматически создаст следующие переменные:

- `MONGOHOST` - хост MongoDB
- `MONGOPORT` - порт MongoDB  
- `MONGOUSER` - пользователь MongoDB
- `MONGOPASSWORD` - пароль MongoDB
- `MONGO_URL` - полная строка подключения

## Шаг 3: Обновление переменных окружения

В настройках вашего backend сервиса в Railway:

1. Перейдите в **Variables** вашего backend сервиса
2. Обновите `MONGODB_URI` на значение `${{MongoDB.MONGO_URL}}`
   - Это автоматически подставит внутреннюю строку подключения Railway
3. Сохраните изменения

## Шаг 4: Экспорт данных из Atlas

Выполните следующие команды для экспорта данных из MongoDB Atlas:

```bash
# Экспорт всех коллекций
mongodump --uri="mongodb+srv://bartender-user:LwbEstQJ7iGIjac0@project-bartender-clust.1fwtezd.mongodb.net/project-bartender" --out=./atlas-backup

# Или экспорт отдельных коллекций в JSON
mongoexport --uri="mongodb+srv://bartender-user:LwbEstQJ7iGIjac0@project-bartender-clust.1fwtezd.mongodb.net/project-bartender" --collection=users --out=users.json
mongoexport --uri="mongodb+srv://bartender-user:LwbEstQJ7iGIjac0@project-bartender-clust.1fwtezd.mongodb.net/project-bartender" --collection=cities --out=cities.json
mongoexport --uri="mongodb+srv://bartender-user:LwbEstQJ7iGIjac0@project-bartender-clust.1fwtezd.mongodb.net/project-bartender" --collection=categories --out=categories.json
mongoexport --uri="mongodb+srv://bartender-user:LwbEstQJ7iGIjac0@project-bartender-clust.1fwtezd.mongodb.net/project-bartender" --collection=roles --out=roles.json
mongoexport --uri="mongodb+srv://bartender-user:LwbEstQJ7iGIjac0@project-bartender-clust.1fwtezd.mongodb.net/project-bartender" --collection=brands --out=brands.json
mongoexport --uri="mongodb+srv://bartender-user:LwbEstQJ7iGIjac0@project-bartender-clust.1fwtezd.mongodb.net/project-bartender" --collection=bars --out=bars.json
mongoexport --uri="mongodb+srv://bartender-user:LwbEstQJ7iGIjac0@project-bartender-clust.1fwtezd.mongodb.net/project-bartender" --collection=products --out=products.json
mongoexport --uri="mongodb+srv://bartender-user:LwbEstQJ7iGIjac0@project-bartender-clust.1fwtezd.mongodb.net/project-bartender" --collection=prizes --out=prizes.json
mongoexport --uri="mongodb+srv://bartender-user:LwbEstQJ7iGIjac0@project-bartender-clust.1fwtezd.mongodb.net/project-bartender" --collection=sales --out=sales.json
mongoexport --uri="mongodb+srv://bartender-user:LwbEstQJ7iGIjac0@project-bartender-clust.1fwtezd.mongodb.net/project-bartender" --collection=transactions --out=transactions.json
mongoexport --uri="mongodb+srv://bartender-user:LwbEstQJ7iGIjac0@project-bartender-clust.1fwtezd.mongodb.net/project-bartender" --collection=carts --out=carts.json
mongoexport --uri="mongodb+srv://bartender-user:LwbEstQJ7iGIjac0@project-bartender-clust.1fwtezd.mongodb.net/project-bartender" --collection=orders --out=orders.json
```

## Шаг 5: Импорт данных в Railway MongoDB

После получения доступа к Railway MongoDB (через Railway CLI или подключение):

```bash
# Импорт всех коллекций
mongorestore --uri="RAILWAY_MONGO_URL" ./atlas-backup/project-bartender

# Или импорт отдельных коллекций
mongoimport --uri="RAILWAY_MONGO_URL" --collection=users --file=users.json
mongoimport --uri="RAILWAY_MONGO_URL" --collection=cities --file=cities.json
# ... и так далее для всех коллекций
```

## Шаг 6: Тестирование

После миграции протестируйте API endpoints:
- `/api/data/cities` - должен вернуть список городов
- `/api/stats` - должен вернуть статистику пользователей

## Преимущества Railway MongoDB

1. **Внутренняя сеть** - быстрое подключение между сервисами
2. **Автоматические переменные** - не нужно настраивать строки подключения
3. **Нет проблем с CORS** - все в одной инфраструктуре
4. **Простое масштабирование** - Railway управляет ресурсами

## Важные заметки

- Railway MongoDB использует внутренний домен `mongodb.railway.internal`
- Переменная `${{MongoDB.MONGO_URL}}` автоматически подставляется Railway
- После изменения переменных окружения сервис автоматически перезапустится