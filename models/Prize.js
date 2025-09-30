const mongoose = require('mongoose');
const { collections, savePrizes } = require('../config/db');

const prizeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: ['merchandise', 'discount', 'experience', 'cash', 'other'],
    default: 'other'
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  originalQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  imageUrl: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  validUntil: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Check availability based on quantity and expiry
prizeSchema.virtual('available').get(function() {
  return this.isActive && this.quantity > 0 && 
         (!this.validUntil || this.validUntil > new Date());
});

// Update timestamp on save
prizeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.isAvailable = this.quantity > 0 && this.isActive && 
                     (!this.validUntil || this.validUntil > new Date());
  next();
});

// Create the mongoose model
const Prize = mongoose.model('Prize', prizeSchema);

// Создаем класс для работы с файловым хранилищем
class PrizeModel {
  static async find(query = {}) {
    const prizes = Array.from(collections.prizes.values());
    return prizes.filter(prize => {
      if (query._id && prize._id !== query._id) return false;
      if (query.isActive !== undefined && prize.isActive !== query.isActive) return false;
      return true;
    });
  }

  static async findById(id) {
    return collections.prizes.get(id) || null;
  }

  static async create(prizeData) {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const prize = {
      _id: id,
      ...prizeData,
      originalQuantity: prizeData.quantity, // Автоматически устанавливаем originalQuantity
      createdAt: new Date(),
      updatedAt: new Date(),
      isAvailable: prizeData.quantity > 0 && (prizeData.isActive !== false)
    };
    
    collections.prizes.set(id, prize);
    savePrizes();
    return prize;
  }

  static async findByIdAndUpdate(id, updateData, options = {}) {
    const prize = collections.prizes.get(id);
    if (!prize) return null;

    const updatedPrize = {
      ...prize,
      ...updateData,
      updatedAt: new Date()
    };

    collections.prizes.set(id, updatedPrize);
    savePrizes();
    return options.new ? updatedPrize : prize;
  }

  static async findByIdAndDelete(id) {
    const prize = collections.prizes.get(id);
    if (!prize) return null;

    collections.prizes.delete(id);
    savePrizes();
    return prize;
  }
}

// Export the MongoDB model directly
module.exports = Prize;