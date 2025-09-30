const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  icon: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true,
    default: '#6B7280'
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
categorySchema.index({ name: 1 });
categorySchema.index({ isActive: 1, sortOrder: 1 });

// Виртуальное поле для подсчета продуктов в категории
categorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// Методы экземпляра
categorySchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

categorySchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Статические методы
categorySchema.statics.getActive = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, displayName: 1 });
};

categorySchema.statics.findByName = function(name) {
  return this.findOne({ name: name.toLowerCase().trim() });
};

// Middleware для валидации перед сохранением
categorySchema.pre('save', function(next) {
  if (this.isNew || this.isModified('name')) {
    this.name = this.name.toLowerCase().trim();
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;