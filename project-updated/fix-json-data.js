const fs = require('fs');
const path = require('path');

// Маппинг ID из созданных базовых данных
const ID_MAPPING = {
  roles: {
    'admin': '68dbb40edee29e54c6880dd4',
    'bartender': '68dbb40fdee29e54c6880dee',
    'brand_representative': '68dbb40fdee29e54c6880df6'
  },
  brands: {
    'gintl': '68dbb40fdee29e54c6880dfe',
    'test_brand': '68dbb40fdee29e54c6880e01'
  },
  categories: {
    'spirits': '68dbb40fdee29e54c6880e04',
    'beer': '68dbb410dee29e54c6880e07',
    'wine': '68dbb410dee29e54c6880e0a'
  },
  cities: {
    'Москва': '68dbb2ce84765a32fd027ff5',
    'Санкт-Петербург': '68dbb2ce84765a32fd027ff6',
    'Екатеринбург': '68dbb2ce84765a32fd027ff7'
  },
  bars: {
    'Test Bar': '68dbb410dee29e54c6880e0e'
  }
};

function generateObjectId() {
  return Math.floor(Date.now() / 1000).toString(16) + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => {
    return Math.floor(Math.random() * 16).toString(16);
  });
}

function fixUsersData() {
  console.log('🔧 Исправление users.json...');
  
  try {
    const usersPath = path.join(__dirname, 'data', 'users.json');
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    
    // Преобразуем объект в массив для обработки
    const usersArray = Object.values(usersData);
    const fixedUsersArray = [];
    
    usersArray.forEach(user => {
      // Генерируем новый ObjectId для пользователя
      const newUserId = generateObjectId();
      
      // Исправляем ссылки на другие коллекции
      let fixedUser = {
        ...user,
        _id: newUserId,
        role: ID_MAPPING.roles[user.role] || ID_MAPPING.roles['bartender'],
        city: ID_MAPPING.cities[user.city] || ID_MAPPING.cities['Москва'],
        bar: ID_MAPPING.bars[user.bar] || ID_MAPPING.bars['Test Bar']
      };
      
      console.log(`  ✅ Пользователь ${user.name}: ${user._id} -> ${newUserId}`);
      console.log(`     Роль: ${user.role} -> ${fixedUser.role}`);
      console.log(`     Город: ${user.city} -> ${fixedUser.city}`);
      console.log(`     Бар: ${user.bar} -> ${fixedUser.bar}`);
      
      fixedUsersArray.push(fixedUser);
    });
    
    // Сохраняем исправленные данные как массив
    fs.writeFileSync(usersPath, JSON.stringify(fixedUsersArray, null, 2), 'utf8');
    console.log(`✅ users.json исправлен (${fixedUsersArray.length} пользователей)`);
    
    return fixedUsersArray;
  } catch (error) {
    console.error('❌ Ошибка при исправлении users.json:', error.message);
    return [];
  }
}

function fixProductsData() {
  console.log('\n🔧 Исправление products.json...');
  
  try {
    const productsPath = path.join(__dirname, 'data', 'products.json');
    const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    
    // Преобразуем объект в массив для обработки
    const productsArray = Object.values(productsData);
    const fixedProductsArray = [];
    
    productsArray.forEach(product => {
      // Генерируем новый ObjectId для продукта
      const newProductId = generateObjectId();
      
      // Исправляем ссылки на другие коллекции и добавляем недостающие поля
      let fixedProduct = {
        ...product,
        _id: newProductId,
        brand: ID_MAPPING.brands[product.brand] || ID_MAPPING.brands['test_brand'],
        category: ID_MAPPING.categories[product.category] || ID_MAPPING.categories['spirits'],
        bottlePrice: product.bottlePrice || product.price || 1000, // Добавляем bottlePrice если отсутствует
        isActive: product.isActive !== undefined ? product.isActive : true,
        inStock: product.inStock !== undefined ? product.inStock : true
      };
      
      console.log(`  ✅ Продукт ${product.name}: ${product._id} -> ${newProductId}`);
      console.log(`     Бренд: ${product.brand} -> ${fixedProduct.brand}`);
      console.log(`     Категория: ${product.category} -> ${fixedProduct.category}`);
      console.log(`     Цена за бутылку: ${fixedProduct.bottlePrice}`);
      
      fixedProductsArray.push(fixedProduct);
    });
    
    // Сохраняем исправленные данные как массив
    fs.writeFileSync(productsPath, JSON.stringify(fixedProductsArray, null, 2), 'utf8');
    console.log(`✅ products.json исправлен (${fixedProductsArray.length} продуктов)`);
    
    return fixedProductsArray;
  } catch (error) {
    console.error('❌ Ошибка при исправлении products.json:', error.message);
    return [];
  }
}

function createBackups() {
  console.log('💾 Создание резервных копий...');
  
  const dataDir = path.join(__dirname, 'data');
  const backupDir = path.join(__dirname, 'data-backup');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  const files = ['users.json', 'products.json'];
  
  files.forEach(file => {
    const sourcePath = path.join(dataDir, file);
    const backupPath = path.join(backupDir, `${file}.backup`);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, backupPath);
      console.log(`  ✅ Резервная копия создана: ${file}.backup`);
    }
  });
}

function main() {
  console.log('🚀 Начинаем исправление JSON данных...\n');
  
  // Создаем резервные копии
  createBackups();
  
  // Исправляем данные
  const fixedUsers = fixUsersData();
  const fixedProducts = fixProductsData();
  
  console.log('\n📊 Результаты исправления:');
  console.log(`  - Пользователи: ${fixedUsers.length} исправлено`);
  console.log(`  - Продукты: ${fixedProducts.length} исправлено`);
  
  console.log('\n✅ Исправление JSON данных завершено!');
  console.log('💡 Резервные копии сохранены в папке data-backup/');
}

main();