require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function hashPasswords() {
  try {
    console.log('🔐 Подключаемся к базе данных...');
    await mongoose.connect(process.env.MONGODB_URI);
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
      const isAlreadyHashed = /^\$2[aby]\$/.test(user.password);
      
      if (!isAlreadyHashed) {
        console.log(`🔄 Хэшируем пароль для пользователя: ${user.email}`);
        
        // Хэшируем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        
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

hashPasswords();