const mongoose = require('mongoose');

const barSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  displayName: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    building: {
      type: String,
      trim: true
    },
    apartment: {
      type: String,
      trim: true
    },
    postalCode: {
      type: String,
      trim: true
    },
    fullAddress: {
      type: String,
      trim: true
    }
  },
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: true
  },
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  contactInfo: {
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Email must be valid'
      }
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Website must be a valid URL'
      }
    }
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  workingHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  capacity: {
    type: Number,
    min: 1
  },
  features: [{
    type: String,
    enum: ['wifi', 'parking', 'terrace', 'live_music', 'karaoke', 'sports_tv', 'food', 'delivery', 'takeaway'],
    lowercase: true
  }],
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    vk: String,
    telegram: String
  },
  images: [{
    url: String,
    description: String,
    isPrimary: { type: Boolean, default: false }
  }],
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
barSchema.index({ name: 1 });
barSchema.index({ city: 1, isActive: 1 });
barSchema.index({ isActive: 1, isVerified: 1 });
barSchema.index({ coordinates: '2dsphere' });
barSchema.index({ manager: 1 });
barSchema.index({ features: 1 });
barSchema.index({ tags: 1 });
barSchema.index({ 'rating.average': -1 });

// Виртуальные поля
barSchema.virtual('fullAddress').get(function() {
  if (this.address && this.address.fullAddress) {
    return this.address.fullAddress;
  }
  
  let parts = [];
  if (this.address) {
    if (this.address.street) parts.push(this.address.street);
    if (this.address.building) parts.push(this.address.building);
    if (this.address.apartment) parts.push(`кв. ${this.address.apartment}`);
  }
  
  return parts.join(', ');
});

barSchema.virtual('employeeCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'bar',
  count: true
});

barSchema.virtual('salesCount', {
  ref: 'Sale',
  localField: '_id',
  foreignField: 'bar',
  count: true
});

// Методы экземпляра
barSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

barSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

barSchema.methods.verify = function() {
  this.isVerified = true;
  return this.save();
};

barSchema.methods.unverify = function() {
  this.isVerified = false;
  return this.save();
};

barSchema.methods.addFeature = function(feature) {
  if (!this.features.includes(feature.toLowerCase())) {
    this.features.push(feature.toLowerCase());
    return this.save();
  }
  return Promise.resolve(this);
};

barSchema.methods.removeFeature = function(feature) {
  this.features = this.features.filter(f => f !== feature.toLowerCase());
  return this.save();
};

barSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag.toLowerCase())) {
    this.tags.push(tag.toLowerCase());
    return this.save();
  }
  return Promise.resolve(this);
};

barSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag.toLowerCase());
  return this.save();
};

barSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (currentTotal + newRating) / this.rating.count;
  return this.save();
};

barSchema.methods.isOpenNow = function() {
  const now = new Date();
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5);
  
  const todayHours = this.workingHours[dayName];
  if (!todayHours || todayHours.closed) return false;
  
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
};

// Статические методы
barSchema.statics.getActive = function() {
  return this.find({ isActive: true }).populate('city').sort({ name: 1 });
};

barSchema.statics.getVerified = function() {
  return this.find({ isActive: true, isVerified: true }).populate('city').sort({ name: 1 });
};

barSchema.statics.findByCity = function(cityId) {
  return this.find({ city: cityId, isActive: true }).populate('city').sort({ name: 1 });
};

barSchema.statics.findByManager = function(managerId) {
  return this.find({ manager: managerId, isActive: true }).populate('city');
};

barSchema.statics.findByFeature = function(feature) {
  return this.find({ 
    features: feature.toLowerCase(), 
    isActive: true 
  }).populate('city').sort({ 'rating.average': -1 });
};

barSchema.statics.findNearby = function(latitude, longitude, maxDistance = 5000) {
  return this.find({
    coordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true
  }).populate('city');
};

barSchema.statics.searchByName = function(searchTerm) {
  return this.find({
    $or: [
      { name: new RegExp(searchTerm, 'i') },
      { displayName: new RegExp(searchTerm, 'i') }
    ],
    isActive: true
  }).populate('city').sort({ name: 1 });
};

barSchema.statics.getTopRated = function(limit = 10) {
  return this.find({ 
    isActive: true, 
    'rating.count': { $gte: 5 } 
  })
  .populate('city')
  .sort({ 'rating.average': -1 })
  .limit(limit);
};

// Middleware
barSchema.pre('save', function(next) {
  // Нормализация названий
  if (this.isNew || this.isModified('name')) {
    this.name = this.name.trim();
  }
  
  if (this.displayName && (this.isNew || this.isModified('displayName'))) {
    this.displayName = this.displayName.trim();
  } else if (!this.displayName) {
    this.displayName = this.name;
  }
  
  // Очистка тегов и фич от дубликатов
  if (this.isModified('tags')) {
    this.tags = [...new Set(this.tags.map(tag => tag.toLowerCase().trim()))];
  }
  
  if (this.isModified('features')) {
    this.features = [...new Set(this.features)];
  }
  
  // Валидация координат
  if (this.coordinates && this.coordinates.latitude && this.coordinates.longitude) {
    if (Math.abs(this.coordinates.latitude) > 90 || Math.abs(this.coordinates.longitude) > 180) {
      return next(new Error('Invalid coordinates'));
    }
  }
  
  next();
});

const Bar = mongoose.model('Bar', barSchema);

module.exports = Bar;