const mongoose = require('mongoose');
const Role = require('../models/Role');
const fs = require('fs');
const path = require('path');

// Путь к файлу для хранения данных
const dataPath = path.join(__dirname, '..', 'data');
const usersFile = path.join(dataPath, 'users.json');
const salesFile = path.join(dataPath, 'sales.json');
const transactionsFile = path.join(dataPath, 'transactions.json');
const prizesFile = path.join(dataPath, 'prizes.json');
const productsFile = path.join(dataPath, 'products.json');

// Создаем папку data если её нет
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

// Функция для загрузки данных из файла
const loadFromFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error);
  }
  return new Map();
};

// Функция для сохранения данных в файл
const saveToFile = (map, filePath) => {
  try {
    const obj = Object.fromEntries(map);
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
  }
};

// Локальная база данных с файловым хранением
const users = loadFromFile(usersFile);
const sales = loadFromFile(salesFile);
const transactions = loadFromFile(transactionsFile);
const prizes = loadFromFile(prizesFile);
const products = loadFromFile(productsFile);

// Функции для автосохранения
const saveUsers = () => saveToFile(users, usersFile);
const saveSales = () => saveToFile(sales, salesFile);
const saveTransactions = () => saveToFile(transactions, transactionsFile);
const savePrizes = () => saveToFile(prizes, prizesFile);
const saveProducts = () => saveToFile(products, productsFile);

// Небольшая утилита ожидания для ретраев подключений
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Опции подключения к MongoDB (единая точка правды)
const getMongoOptions = () => ({
  // Даем больше времени на выбор ноды кластера и сетевые колебания
  serverSelectionTimeoutMS: 20000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  autoIndex: true,
  keepAlive: true,
  keepAliveInitialDelay: 300000,
});

// Управление переподключением
let reconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 20;
const BASE_RECONNECT_DELAY_MS = 2000;

const scheduleReconnect = async () => {
  if (!process.env.MONGODB_URI) return;
  if (reconnecting) return;
  reconnecting = true;
  const delay = Math.min(BASE_RECONNECT_DELAY_MS * (1 + reconnectAttempts), 15000);
  console.log(`⏳ Попытка переподключения к MongoDB через ${delay}мс (попытка ${reconnectAttempts + 1})`);
  await wait(delay);
  try {
    await mongoose.connect(process.env.MONGODB_URI, getMongoOptions());
    reconnectAttempts = 0;
    console.log('🔄 MongoDB успешно переподключена');
  } catch (err) {
    reconnectAttempts++;
    console.error('❌ Ошибка переподключения MongoDB:', err.message);
    reconnecting = false;
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      // Планируем следующую попытку
      scheduleReconnect();
    } else {
      console.error('🚫 Достигнут лимит попыток переподключения MongoDB');
    }
  } finally {
    reconnecting = false;
  }
};

// Подключение к MongoDB
const connectDB = async () => {
  try {
    // Проверяем доступность MongoDB
    if (process.env.MONGODB_URI) {
      const mongoOptions = getMongoOptions();

      const MAX_RETRIES = 3;
      const RETRY_DELAY_MS = 3000;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const conn = await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
          console.log(`MongoDB Connected: ${conn.connection.host}`);
          console.log(`Database: ${conn.connection.name}`);

          // Ensure default system roles exist
          try {
            await Role.createDefaultRoles();
            console.log('Default roles ensured');
          } catch (rolesErr) {
            console.error('Error ensuring default roles:', rolesErr.message);
          }

          // Логирование состояния соединения и авто‑реконнект
          mongoose.connection.on('connected', () => {
            console.log('✔️  MongoDB: connected');
          });
          mongoose.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB: disconnected. Пытаюсь переподключиться...');
            scheduleReconnect();
          });
          mongoose.connection.on('reconnected', () => {
            console.log('✔️  MongoDB: reconnected');
          });
          mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err.message);
            if (mongoose.connection.readyState !== 1) {
              scheduleReconnect();
            }
          });

          return; // Успешное подключение — выходим без фолбэка
        } catch (mongoError) {
          console.log(`Попытка подключения к MongoDB #${attempt} не удалась: ${mongoError.message}`);
          if (attempt < MAX_RETRIES) {
            console.log(`Повторная попытка через ${RETRY_DELAY_MS}мс...`);
            await wait(RETRY_DELAY_MS);
          } else {
            console.log('MongoDB недоступен после нескольких попыток, переключаемся на файловое хранилище');
          }
        }
      }
    }

    // Используем локальную базу в файлах
    console.log('Using file-based database for development');
    console.log('Database Connected: File-Based Storage');
    
    // Создаем тестового администратора
    const adminUser = {
      _id: 'admin_id',
      name: 'Admin User',
      email: 'admin@projectbartender.com',
      password: '$2a$10$UJNvobb0FR1bXMtgkfKkquDDoYsDjCo8IzZNpIUGzx9i4kOe1lj6O', // admin123
      phone: '+7 (999) 123-45-67',
      bar: 'Admin Panel',
      city: 'Москва',
      role: 'admin',
      points: 0,
      totalEarnings: 0,
      availableBalance: 0,
      withdrawnAmount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    users.set('admin_id', adminUser);
    
  } catch (error) {
    console.error('Database connection error:', error.message);
    // Не завершаем процесс, используем in-memory базу
    console.log('Falling back to in-memory database');
  }
};

// Экспортируем коллекции для использования в моделях
module.exports = {
  connectDB,
  collections: {
    users,
    sales,
    transactions,
    prizes,
    products
  },
  // Функции для сохранения данных
  saveUsers,
  saveSales,
  saveTransactions,
  savePrizes,
  saveProducts
};
// Глобальные настройки Mongoose для стабильности
mongoose.set('strictQuery', true);
// Отключаем буферизацию команд, чтобы не ждать таймауты при дисконнекте
mongoose.set('bufferCommands', false);
// Снижаем время ожидания буфера для более быстрого фолбэка
mongoose.set('bufferTimeoutMS', 2000);