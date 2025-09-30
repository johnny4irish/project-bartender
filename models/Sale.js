const mongoose = require('mongoose');
const { collections, saveSales } = require('../config/db');

const saleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bar: {
    type: String,
    required: true
  },
  product: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  pointsEarned: {
    type: Number,
    default: 0
  },
  proofType: {
    type: String,
    enum: ['receipt', 'photo'],
    default: 'receipt'
  },
  proofData: {
    filename: String,
    originalName: String,
    path: String,
    size: Number
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  verificationNotes: {
    type: String,
    default: ''
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

const MongoSale = mongoose.model('Sale', saleSchema);



// Export the MongoDB model directly
module.exports = MongoSale;