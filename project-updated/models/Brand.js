const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
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
  logo: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Поле необязательное
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Website must be a valid URL'
    }
  },
  contactInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Поле необязательное
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Email must be valid'
      }
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  country: {
    type: String,
    trim: true
  },
  foundedYear: {
    type: Number,
    min: 1800,
    max: new Date().getFullYear()
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    linkedin: String
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
brandSchema.index({ name: 1 });
brandSchema.index({ isActive: 1, name: 1 });
brandSchema.index({ tags: 1 });
brandSchema.index({ country: 1 });

// Виртуальное поле для подсчета продуктов бренда
brandSchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'brand',
  count: true
});

// Методы экземпляра
brandSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

brandSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

brandSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag.toLowerCase())) {
    this.tags.push(tag.toLowerCase());
    return this.save();
  }
  return Promise.resolve(this);
};

brandSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag.toLowerCase());
  return this.save();
};

// Статические методы
brandSchema.statics.getActive = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

brandSchema.statics.findByName = function(name) {
  return this.findOne({ name: new RegExp(`^${name}$`, 'i') });
};

brandSchema.statics.findByCountry = function(country) {
  return this.find({ country: new RegExp(`^${country}$`, 'i'), isActive: true });
};

brandSchema.statics.findByTag = function(tag) {
  return this.find({ tags: tag.toLowerCase(), isActive: true });
};

// Middleware для валидации перед сохранением
brandSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('name')) {
    this.name = this.name.trim();
  }
  
  // Очистка тегов от дубликатов
  if (this.isModified('tags')) {
    this.tags = [...new Set(this.tags.map(tag => tag.toLowerCase().trim()))];
  }
  
  next();
});

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;