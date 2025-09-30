const mongoose = require('mongoose')

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  // Настройки начисления баллов
  pointsCalculationType: {
    type: String,
    enum: ['per_ruble', 'per_portion', 'per_volume'],
    default: 'per_ruble'
  },
  pointsPerRuble: {
    type: Number,
    default: 10/150, // 10 баллов за 150 рублей по умолчанию
    min: 0
  },
  // Для расчета по порциям (например, джин)
  pointsPerPortion: {
    type: Number,
    default: 0,
    min: 0
  },
  portionSizeGrams: {
    type: Number,
    default: 40, // стандартная порция 40г
    min: 1
  },
  // Параметры продукта для производителей
  wholesalePrice: {
    type: Number, // отгрузочная цена с диллера
    default: 0,
    min: 0
  },
  bottlePrice: {
    type: Number, // цена за всю бутылку для расчета продаж
    required: true,
    min: 0
  },
  portionsPerBottle: {
    type: Number, // количество порций в бутылке
    default: 12, // стандартно 12 порций по 40г в бутылке 500мл
    min: 0.1 // разрешаем дробные значения
  },
  packageVolume: {
    type: Number, // объем упаковки в мл
    default: 500,
    min: 1
  },
  alcoholContent: {
    type: Number, // процент алкоголя
    default: 0,
    min: 0,
    max: 100
  },
  // Ценовые ограничения для розницы
  minPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  maxPrice: {
    type: Number,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Обновляем updatedAt при каждом сохранении
ProductSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

// Индексы для быстрого поиска
ProductSchema.index({ name: 1, brand: 1 })
ProductSchema.index({ category: 1 })
ProductSchema.index({ brand: 1 })
ProductSchema.index({ isActive: 1 })

// Виртуальные поля для популяции
ProductSchema.virtual('brandInfo', {
  ref: 'Brand',
  localField: 'brand',
  foreignField: '_id',
  justOne: true
});

ProductSchema.virtual('categoryInfo', {
  ref: 'Category',
  localField: 'category',
  foreignField: '_id',
  justOne: true
});

// Методы для работы с популяцией
ProductSchema.methods.populateRefs = function() {
  return this.populate(['brand', 'category']);
};

ProductSchema.statics.findWithRefs = function(query = {}) {
  return this.find(query).populate(['brand', 'category']);
};

// Create the MongoDB model
const Product = mongoose.model('Product', ProductSchema);

// Export the MongoDB model directly
module.exports = Product;