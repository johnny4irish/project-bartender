const mongoose = require('mongoose')

const CartItemSchema = new mongoose.Schema({
  prize: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prize',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  priceAtTime: {
    type: Number,
    required: true
  }
}, { timestamps: true })

const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [CartItemSchema],
  totalCost: {
    type: Number,
    default: 0
  }
}, { timestamps: true })

// Вычисляем общую стоимость корзины
CartSchema.methods.calculateTotal = function() {
  this.totalCost = this.items.reduce((total, item) => {
    return total + (item.priceAtTime * item.quantity)
  }, 0)
  return this.totalCost
}

// Добавить товар в корзину
CartSchema.methods.addItem = function(prizeId, quantity, price) {
  console.log('addItem вызван с параметрами:', { prizeId, quantity, price })
  
  const existingItem = this.items.find(item => item.prize.toString() === prizeId.toString())
  
  if (existingItem) {
    console.log('Найден существующий товар, увеличиваем количество')
    existingItem.quantity += quantity
  } else {
    console.log('Добавляем новый товар в корзину')
    this.items.push({
      prize: prizeId,
      quantity: quantity,
      priceAtTime: price
    })
  }
  
  this.calculateTotal()
  console.log('Корзина после добавления:', { itemsCount: this.items.length, totalCost: this.totalCost })
}

// Удалить товар из корзины
CartSchema.methods.removeItem = function(prizeId) {
  this.items = this.items.filter(item => item.prize.toString() !== prizeId.toString())
  this.calculateTotal()
}

// Обновить количество товара
CartSchema.methods.updateQuantity = function(prizeId, quantity) {
  const item = this.items.find(item => item.prize.toString() === prizeId.toString())
  if (item) {
    if (quantity <= 0) {
      this.removeItem(prizeId)
    } else {
      item.quantity = quantity
      this.calculateTotal()
    }
  }
}

// Очистить корзину
CartSchema.methods.clear = function() {
  this.items = []
  this.totalCost = 0
}

module.exports = mongoose.model('Cart', CartSchema)