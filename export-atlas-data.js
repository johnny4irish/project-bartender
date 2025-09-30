const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Atlas connection string
const ATLAS_URI = 'mongodb+srv://bartender-user:LwbEstQJ7iGIjac0@project-bartender-clust.1fwtezd.mongodb.net/project-bartender?retryWrites=true&w=majority&appName=project-bartender-cluster';

// Import all models
const { getModel } = require('./models/ModelFactory');

async function exportData() {
    try {
        console.log('🔗 Подключение к MongoDB Atlas...');
        await mongoose.connect(ATLAS_URI);
        console.log('✅ Подключение успешно!');

        // Create export directory
        const exportDir = './atlas-export';
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir);
        }

        // List of collections to export
        const collections = [
            'User', 'City', 'Role', 'Brand', 'Bar', 'Category',
            'Product', 'Prize', 'Sale', 'Transaction', 'Cart', 'Order'
        ];

        console.log('📦 Экспорт данных...');
        
        for (const collectionName of collections) {
            try {
                const Model = getModel(collectionName);
                const data = await Model.find({}).lean();
                
                const filePath = path.join(exportDir, `${collectionName.toLowerCase()}.json`);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                
                console.log(`✅ ${collectionName}: ${data.length} записей экспортировано`);
            } catch (error) {
                console.log(`⚠️  ${collectionName}: Ошибка экспорта - ${error.message}`);
            }
        }

        console.log('🎉 Экспорт завершен! Файлы сохранены в папке atlas-export/');
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Отключение от Atlas');
    }
}

exportData();