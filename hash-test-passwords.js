const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function hashTestPasswords() {
  try {
    console.log('🔐 Подключаемся к базе данных test на Railway...');
    await mongoose.connect('mongodb://mongo:mmbccaUNRtKkqXsTuJDSNepNJebtyTXt@metro.proxy.rlwy.net:25358/test?authSource=admin');
    console.log('✅ Подключение к MongoDB успешно');

    // Получаем коллекцию пользователей напрямую
    const usersCollection = mongoose.connection.db.collection('users');
    
    // Находим всех пользователей
    const users = await usersCollection.find({}).toArray();
    console.log(`📊 Найдено пользователей: ${users.length}`);

    let hashedCount = 0;
    
    for (const user of users) {
      // Проверяем, является ли пароль уже хэшированным
      // Хэшированные пароли bcrypt начинаются с $2a$, $2b$ или $2y$
      const isAlreadyHashed = /^\$2[aby]\$\d+\$/.test(user.password);
      
      if (!isAlreadyHashed) {
        console.log(`🔄 Хэшируем пароль для пользователя: ${user.email}`);
        console.log(`   Текущий пароль: ${user.password}`);
        
        // Хэшируем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        
        console.log(`   Новый хэш: ${hashedPassword.substring(0, 30)}...`);
        
        // Обновляем пароль в базе данных
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
        
        hashedCount++;
        console.log(`✅ Пароль обновлен для: ${user.email}`);
      } else {
        console.log(`⏭️  Пароль уже хэширован для: ${user.email}`);
      }
    }

    console.log(`\n🎉 Обработка завершена!`);
    console.log(`📈 Хэшировано паролей: ${hashedCount}`);
    console.log(`📊 Всего пользователей: ${users.length}`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Отключение от MongoDB');
  }
}

hashTestPasswords();