const mongoose = require('mongoose')

const OrderItemSchema = new mongoose.Schema({
  prize: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prize',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  priceAtTime: {
    type: Number,
    required: true
  },
  prizeName: {
    type: String,
    required: true
  },
  prizeDescription: {
    type: String
  }
})

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [OrderItemSchema],
  totalCost: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: 'points'
  },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  deliveryAddress: {
    street: String,
    city: String,
    postalCode: String,
    country: String,
    phone: String
  },
  notes: {
    type: String
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
  estimatedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  }
}, { timestamps: true })

// Генерация номера заказа
OrderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  }
  next()
})

// Обновление статуса с историей
OrderSchema.methods.updateStatus = function(newStatus, note = '') {
  this.status = newStatus
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note: note
  })
  
  // Установить дату доставки если статус "delivered"
  if (newStatus === 'delivered') {
    this.actualDelivery = new Date()
  }
}

// Вычисление общей стоимости
OrderSchema.methods.calculateTotal = function() {
  this.totalCost = this.items.reduce((total, item) => {
    return total + (item.priceAtTime * item.quantity)
  }, 0)
  return this.totalCost
}

// Проверка возможности отмены
OrderSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status)
}

// Отмена заказа
OrderSchema.methods.cancel = function(reason = '') {
  if (this.canBeCancelled()) {
    this.updateStatus('cancelled', reason)
    return true
  }
  return false
}

module.exports = mongoose.model('Order', OrderSchema)