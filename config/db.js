const mongoose = require('mongoose');
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

// Подключение к MongoDB
const connectDB = async () => {
  try {
    // Проверяем доступность MongoDB
    if (process.env.MONGODB_URI) {
      try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 5000, // Таймаут 5 секунд
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Database: ${conn.connection.name}`);
        return;
      } catch (mongoError) {
        console.log('MongoDB недоступен, переключаемся на файловое хранилище');
        console.log('Ошибка:', mongoError.message);
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