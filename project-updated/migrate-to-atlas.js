const mongoose = require('mongoose');
require('dotenv').config();

// Подключения к базам данных
const LOCAL_URI = 'mongodb://localhost:27017/project-bartender';
const ATLAS_URI = process.env.MONGODB_URI;

// Импорт моделей
const { getModel } = require('./models/ModelFactory');

async function migrateData() {
  console.log('🚀 Начинаем миграцию данных из локальной MongoDB в Atlas...\n');

  try {
    // Подключение к локальной базе данных
    console.log('📡 Подключаемся к локальной базе данных...');
    const localConnection = await mongoose.createConnection(LOCAL_URI);
    console.log('✅ Подключение к локальной базе установлено');

    // Подключение к Atlas
    console.log('📡 Подключаемся к MongoDB Atlas...');
    const atlasConnection = await mongoose.createConnection(ATLAS_URI);
    console.log('✅ Подключение к Atlas установлено\n');

    // Получаем модели для обеих баз данных
    const localModels = {
      User: localConnection.model('User', require('./models/User').schema),
      Prize: localConnection.model('Prize', require('./models/Prize').schema),
      Sale: localConnection.model('Sale', require('./models/Sale').schema),
      Transaction: localConnection.model('Transaction', require('./models/Transaction').schema),
      Cart: localConnection.model('Cart', require('./models/Cart').schema),
      City: localConnection.model('City', require('./models/City').schema),
      Bar: localConnection.model('Bar', require('./models/Bar').schema),
      Role: localConnection.model('Role', require('./models/Role').schema),
      Product: localConnection.model('Product', require('./models/Product').schema),
      Category: localConnection.model('Category', require('./models/Category').schema),
      Brand: localConnection.model('Brand', require('./models/Brand').schema),
      Order: localConnection.model('Order', require('./models/Order').schema)
    };

    const atlasModels = {
      User: atlasConnection.model('User', require('./models/User').schema),
      Prize: atlasConnection.model('Prize', require('./models/Prize').schema),
      Sale: atlasConnection.model('Sale', require('./models/Sale').schema),
      Transaction: atlasConnection.model('Transaction', require('./models/Transaction').schema),
      Cart: atlasConnection.model('Cart', require('./models/Cart').schema),
      City: atlasConnection.model('City', require('./models/City').schema),
      Bar: atlasConnection.model('Bar', require('./models/Bar').schema),
      Role: atlasConnection.model('Role', require('./models/Role').schema),
      Product: atlasConnection.model('Product', require('./models/Product').schema),
      Category: atlasConnection.model('Category', require('./models/Category').schema),
      Brand: atlasConnection.model('Brand', require('./models/Brand').schema),
      Order: atlasConnection.model('Order', require('./models/Order').schema)
    };

    // Список коллекций для миграции (в правильном порядке из-за зависимостей)
    const collections = [
      'Role',
      'City', 
      'Bar',
      'Category',
      'Brand',
      'Product',
      'User',
      'Prize',
      'Sale',
      'Transaction',
      'Cart',
      'Order'
    ];

    let totalMigrated = 0;

    // Миграция каждой коллекции
    for (const collectionName of collections) {
      console.log(`📦 Мигрируем коллекцию: ${collectionName}`);
      
      try {
        // Получаем данные из локальной базы
        const localData = await localModels[collectionName].find({});
        console.log(`   Найдено записей в локальной базе: ${localData.length}`);

        if (localData.length === 0) {
          console.log(`   ⚠️  Коллекция ${collectionName} пуста, пропускаем\n`);
          continue;
        }

        // Проверяем, есть ли уже данные в Atlas
        const existingCount = await atlasModels[collectionName].countDocuments({});
        
        if (existingCount > 0) {
          console.log(`   ⚠️  В Atlas уже есть ${existingCount} записей в коллекции ${collectionName}`);
          console.log(`   🗑️  Очищаем коллекцию перед миграцией...`);
          await atlasModels[collectionName].deleteMany({});
        }

        // Вставляем данные в Atlas
        if (localData.length > 0) {
          await atlasModels[collectionName].insertMany(localData, { ordered: false });
          console.log(`   ✅ Успешно мигрировано ${localData.length} записей`);
          totalMigrated += localData.length;
        }

      } catch (error) {
        console.log(`   ❌ Ошибка при миграции ${collectionName}:`, error.message);
        
        // Если ошибка связана с дублированием, пробуем по одной записи
        if (error.message.includes('duplicate') || error.code === 11000) {
          console.log(`   🔄 Пробуем миграцию по одной записи...`);
          const localData = await localModels[collectionName].find({});
          let migrated = 0;
          
          for (const doc of localData) {
            try {
              await atlasModels[collectionName].create(doc.toObject());
              migrated++;
            } catch (dupError) {
              console.log(`   ⚠️  Пропускаем дублированную запись: ${doc._id}`);
            }
          }
          
          console.log(`   ✅ Мигрировано ${migrated} из ${localData.length} записей`);
          totalMigrated += migrated;
        }
      }
      
      console.log('');
    }

    // Проверяем результаты миграции
    console.log('📊 Результаты миграции:');
    console.log('========================');
    
    for (const collectionName of collections) {
      const localCount = await localModels[collectionName].countDocuments({});
      const atlasCount = await atlasModels[collectionName].countDocuments({});
      
      const status = localCount === atlasCount ? '✅' : '⚠️';
      console.log(`${status} ${collectionName}: ${localCount} → ${atlasCount}`);
    }

    console.log(`\n🎉 Миграция завершена! Всего перенесено записей: ${totalMigrated}`);

    // Закрываем соединения
    await localConnection.close();
    await atlasConnection.close();
    
    console.log('\n✅ Соединения с базами данных закрыты');
    console.log('🚀 Теперь можно перезапустить Railway для применения изменений');

  } catch (error) {
    console.error('❌ Критическая ошибка миграции:', error);
    process.exit(1);
  }
}

// Запуск миграции
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('\n🎯 Миграция успешно завершена!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Ошибка выполнения миграции:', error);
      process.exit(1);
    });
}

module.exports = { migrateData };