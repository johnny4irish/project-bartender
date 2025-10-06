const mongoose = require('mongoose');
const { collections, saveTransactions } = require('../config/db');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['withdrawal', 'earning', 'redemption', 'bonus'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  commission: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  method: {
    type: String,
    enum: ['sbp', 'card', 'cash', 'points'],
    default: 'sbp'
  },
  details: {
    phoneNumber: String,
    bankName: String,
    cardNumber: String,
    description: String
  },
  sbpData: {
    merchantId: String,
    qrId: String,
    paymentId: String
  },
  errorMessage: String,
  processedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Создаем модель MongoDB
const MongoTransaction = mongoose.model('Transaction', transactionSchema);

// Export the MongoDB model directly
module.exports = MongoTransaction;