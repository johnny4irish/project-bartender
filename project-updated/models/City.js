const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  region: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true,
    default: 'Russia'
  },
  timezone: {
    type: String,
    trim: true,
    default: 'Europe/Moscow'
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
  population: {
    type: Number,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isCapital: {
    type: Boolean,
    default: false
  },
  postalCodes: [{
    type: String,
    trim: true
  }],
  phoneCode: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Составной индекс для уникальности города в стране
citySchema.index({ name: 1, country: 1 }, { unique: true });
citySchema.index({ isActive: 1, country: 1 });
citySchema.index({ region: 1, country: 1 });
citySchema.index({ coordinates: '2dsphere' }); // Геопространственный индекс

// Виртуальное поле для полного названия
citySchema.virtual('fullName').get(function() {
  if (this.region && this.region !== this.name) {
    return `${this.name}, ${this.region}, ${this.country}`;
  }
  return `${this.name}, ${this.country}`;
});

// Виртуальное поле для подсчета пользователей в городе
citySchema.virtual('userCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'city',
  count: true
});

// Виртуальное поле для подсчета баров в городе
citySchema.virtual('barCount', {
  ref: 'Bar',
  localField: '_id',
  foreignField: 'city',
  count: true
});

// Методы экземпляра
citySchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

citySchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

citySchema.methods.setCapital = function() {
  this.isCapital = true;
  return this.save();
};

citySchema.methods.addPostalCode = function(code) {
  if (!this.postalCodes.includes(code)) {
    this.postalCodes.push(code);
    return this.save();
  }
  return Promise.resolve(this);
};

// Статические методы
citySchema.statics.getActive = function() {
  return this.find({ isActive: true }).sort({ country: 1, name: 1 });
};

citySchema.statics.findByCountry = function(country) {
  return this.find({ 
    country: new RegExp(`^${country}$`, 'i'), 
    isActive: true 
  }).sort({ name: 1 });
};

citySchema.statics.findByRegion = function(region) {
  return this.find({ 
    region: new RegExp(`^${region}$`, 'i'), 
    isActive: true 
  }).sort({ name: 1 });
};

citySchema.statics.findCapitals = function() {
  return this.find({ isCapital: true, isActive: true }).sort({ country: 1 });
};

citySchema.statics.findNearby = function(latitude, longitude, maxDistance = 100000) {
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
  });
};

citySchema.statics.searchByName = function(searchTerm) {
  return this.find({
    name: new RegExp(searchTerm, 'i'),
    isActive: true
  }).sort({ name: 1 });
};

// Middleware для валидации перед сохранением
citySchema.pre('save', function(next) {
  // Нормализация названий
  if (this.isNew || this.isModified('name')) {
    this.name = this.name.trim();
  }
  
  if (this.isNew || this.isModified('country')) {
    this.country = this.country.trim();
  }
  
  if (this.region && (this.isNew || this.isModified('region'))) {
    this.region = this.region.trim();
  }
  
  // Валидация координат
  if (this.coordinates && this.coordinates.latitude && this.coordinates.longitude) {
    if (Math.abs(this.coordinates.latitude) > 90 || Math.abs(this.coordinates.longitude) > 180) {
      return next(new Error('Invalid coordinates'));
    }
  }
  
  next();
});

const City = mongoose.model('City', citySchema);

module.exports = City;