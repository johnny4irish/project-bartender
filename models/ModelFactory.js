const mongoose = require('mongoose');

/**
 * MongoDB Model Factory
 * Provides unified access to MongoDB models with connection management
 */
class ModelFactory {
  constructor() {
    this.models = new Map();
  }

  checkConnection() {
    try {
      const isConnected = mongoose.connection.readyState === 1;
      if (!isConnected) {
        console.log('⚠️  MongoDB не подключена. Убедитесь что MongoDB запущена и доступна.');
      }
      return isConnected;
    } catch (error) {
      console.error('❌ Ошибка проверки подключения к MongoDB:', error.message);
      return false;
    }
  }

  /**
   * Register a MongoDB model
   * @param {string} name - Model name
   * @param {Object} mongoModel - MongoDB model
   */
  register(name, mongoModel) {
    this.models.set(name, mongoModel);
  }

  /**
   * Get MongoDB model (returns model even if not connected yet)
   * @param {string} name - Model name
   * @returns {Object} - MongoDB model
   */
  getModel(name) {
    const model = this.models.get(name);
    if (!model) {
      throw new Error(`Модель '${name}' не зарегистрирована в ModelFactory`);
    }

    return model;
  }

  /**
   * Get all registered model names
   * @returns {Array} - Array of model names
   */
  getRegisteredModels() {
    return Array.from(this.models.keys());
  }

  /**
   * Check if a model is registered
   * @param {string} name - Model name
   * @returns {boolean}
   */
  isRegistered(name) {
    return this.models.has(name);
  }

  /**
   * Ensure MongoDB connection before operations
   * @returns {Promise<boolean>}
   */
  async ensureConnection() {
    if (!this.isMongoConnected) {
      try {
        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(process.env.MONGODB_URI);
        }
        this.checkConnection();
      } catch (error) {
        console.error('❌ Не удалось подключиться к MongoDB:', error.message);
        throw new Error('MongoDB недоступна. Проверьте подключение к базе данных.');
      }
    }
    return this.isMongoConnected;
  }
}

// Import all MongoDB models
const MongoUser = require('./User');
const MongoSale = require('./Sale');
const MongoTransaction = require('./Transaction');
const MongoPrize = require('./Prize');
const MongoProduct = require('./Product');
const MongoCart = require('./Cart');
const MongoOrder = require('./Order');
const MongoCity = require('./City');
const MongoCategory = require('./Category');
const MongoRole = require('./Role');
const MongoBrand = require('./Brand');
const MongoBar = require('./Bar');

// Create singleton instance
const modelFactory = new ModelFactory();

// Register all MongoDB models
modelFactory.register('User', MongoUser);
modelFactory.register('Sale', MongoSale);
modelFactory.register('Transaction', MongoTransaction);
modelFactory.register('Prize', MongoPrize);
modelFactory.register('Product', MongoProduct);
modelFactory.register('Cart', MongoCart);
modelFactory.register('Order', MongoOrder);
modelFactory.register('City', MongoCity);
modelFactory.register('Category', MongoCategory);
modelFactory.register('Role', MongoRole);
modelFactory.register('Brand', MongoBrand);
modelFactory.register('Bar', MongoBar);

// Export the factory and convenience methods
module.exports = {
  modelFactory,
  getModel: (name) => modelFactory.getModel(name),
  checkConnection: () => modelFactory.checkConnection(),
  ensureConnection: () => modelFactory.ensureConnection(),
  User: () => modelFactory.getModel('User'),
  Sale: () => modelFactory.getModel('Sale'),
  Transaction: () => modelFactory.getModel('Transaction'),
  Prize: () => modelFactory.getModel('Prize'),
  Product: () => modelFactory.getModel('Product'),
  Cart: () => modelFactory.getModel('Cart'),
  Order: () => modelFactory.getModel('Order'),
  City: () => modelFactory.getModel('City'),
  Category: () => modelFactory.getModel('Category'),
  Role: () => modelFactory.getModel('Role'),
  Brand: () => modelFactory.getModel('Brand'),
  Bar: () => modelFactory.getModel('Bar')
};