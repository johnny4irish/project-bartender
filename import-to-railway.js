const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Railway MongoDB connection string with TCP proxy data and authentication
const RAILWAY_URI = 'mongodb://mongo:mmbccaUNRtKkqXsTuJDSNepNJebtyTXt@metro.proxy.rlwy.net:25358/test?authSource=admin';

// Import all models
const { getModel } = require('./models/ModelFactory');

async function importData() {
    try {
        console.log('🔗 Подключение к Railway MongoDB...');
        await mongoose.connect(RAILWAY_URI);
        console.log('✅ Подключение к Railway успешно!');

        // Import from local data directory
        const dataDir = './data';
        
        // Mapping of files to model names
        const fileModelMap = {
            'users.json': 'User',
            'prizes.json': 'Prize',
            'products.json': 'Product',
            'sales.json': 'Sale',
            'transactions.json': 'Transaction'
        };

        console.log('📦 Импорт данных в Railway MongoDB...');
        
        for (const [fileName, modelName] of Object.entries(fileModelMap)) {
            try {
                const filePath = path.join(dataDir, fileName);
                
                if (!fs.existsSync(filePath)) {
                    console.log(`⚠️  ${fileName}: Файл не найден, пропускаем`);
                    continue;
                }

                const rawData = fs.readFileSync(filePath, 'utf8');
                let data;
                
                try {
                    data = JSON.parse(rawData);
                } catch (parseError) {
                    console.log(`⚠️  ${fileName}: Ошибка парсинга JSON`);
                    continue;
                }
                
                // Handle object format (convert to array)
                if (typeof data === 'object' && !Array.isArray(data)) {
                    data = Object.values(data);
                }
                
                if (!Array.isArray(data) || data.length === 0) {
                    console.log(`⚠️  ${fileName}: Пустой файл или неверный формат`);
                    continue;
                }

                const Model = getModel(modelName);
                
                // Clear existing data
                await Model.deleteMany({});
                
                // Insert new data
                await Model.insertMany(data);
                
                console.log(`✅ ${modelName}: ${data.length} записей импортировано из ${fileName}`);
            } catch (error) {
                console.log(`❌ ${fileName}: Ошибка импорта - ${error.message}`);
            }
        }

        // Create some basic data if needed
        await createBasicData();

        console.log('🎉 Импорт завершен!');
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Отключение от Railway MongoDB');
    }
}

async function createBasicData() {
    try {
        // Create basic cities if none exist
        const City = getModel('City');
        const cityCount = await City.countDocuments();
        
        if (cityCount === 0) {
            const cities = [
                { name: 'Москва', _id: new mongoose.Types.ObjectId() },
                { name: 'Санкт-Петербург', _id: new mongoose.Types.ObjectId() },
                { name: 'Екатеринбург', _id: new mongoose.Types.ObjectId() }
            ];
            await City.insertMany(cities);
            console.log('✅ Созданы базовые города');
        }

        // Create basic roles if none exist
        const Role = getModel('Role');
        const roleCount = await Role.countDocuments();
        
        if (roleCount === 0) {
            const roles = [
                { name: 'admin', permissions: ['all'], _id: new mongoose.Types.ObjectId() },
                { name: 'user', permissions: ['read'], _id: new mongoose.Types.ObjectId() }
            ];
            await Role.insertMany(roles);
            console.log('✅ Созданы базовые роли');
        }

        // Create basic categories if none exist
        const Category = getModel('Category');
        const categoryCount = await Category.countDocuments();
        
        if (categoryCount === 0) {
            const categories = [
                { name: 'Алкоголь', _id: new mongoose.Types.ObjectId() },
                { name: 'Безалкогольные напитки', _id: new mongoose.Types.ObjectId() }
            ];
            await Category.insertMany(categories);
            console.log('✅ Созданы базовые категории');
        }

    } catch (error) {
        console.log('⚠️  Ошибка создания базовых данных:', error.message);
    }
}

importData();