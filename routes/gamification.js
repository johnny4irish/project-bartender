const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { getModel } = require('../models/ModelFactory')
const User = getModel('User')
const Prize = getModel('Prize')
const Transaction = getModel('Transaction')
const Cart = require('../models/Cart')
const Order = require('../models/Order')
const mongoose = require('mongoose');

// Get bartender role ObjectIds (supports both 'bartender' and 'test_bartender')
const getBartenderRoleIds = async () => {
  const Role = require('../models/Role');
  const roles = await Role.find({ name: { $in: ['bartender', 'test_bartender'] } });
  return roles.map(r => r._id);
};

// @route   GET /api/gamification/leaderboard
// @desc    Получить рейтинг пользователей
// @access  Private
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const period = req.query.period || 'all' // all, monthly, weekly
    const limit = parseInt(req.query.limit) || 50

    let dateFilter = {}
    const now = new Date()

    if (period === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      dateFilter = { createdAt: { $gte: startOfMonth } }
    } else if (period === 'weekly') {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
      dateFilter = { createdAt: { $gte: startOfWeek } }
    }

    let leaderboard
    if (period === 'all') {
      // Общий рейтинг по всем баллам
      const bartenderRoleIds = await getBartenderRoleIds();
      const users = await User.find({ role: { $in: bartenderRoleIds } });
      
      // Фильтруем активных пользователей и сортируем по очкам
      const activeUsers = users
        .filter(user => user.isActive !== false) // Если isActive не определено, считаем активным
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, limit);
      
      leaderboard = activeUsers.map(user => ({
        _id: user._id,
        name: user.name,
        bar: user.bar,
        city: user.city,
        points: user.points || 0,
        totalEarnings: user.totalEarnings || 0
      }));
      
    } else {
      // Рейтинг за период по транзакциям
      const transactions = await Transaction.find({
        type: 'earning',
        ...dateFilter
      });
      
      // Группируем транзакции по пользователям
      const userPointsMap = new Map();
      transactions.forEach(transaction => {
        const userId = transaction.user.toString();
        const currentPoints = userPointsMap.get(userId) || 0;
        userPointsMap.set(userId, currentPoints + (transaction.amount || 0));
      });
      
      // Получаем информацию о пользователях
      const userIds = Array.from(userPointsMap.keys());
      const bartenderRoleIds = await getBartenderRoleIds();
      const users = await User.find({ 
        _id: { $in: userIds },
        role: { $in: bartenderRoleIds }
      });
      
      // Создаем рейтинг за период
      const periodStats = Array.from(userPointsMap.entries()).map(([userId, periodPoints]) => {
        const user = users.find(u => u._id.toString() === userId);
        if (!user || user.isActive === false) return null;
        
        return {
          _id: userId,
          name: user.name,
          bar: user.bar,
          city: user.city,
          points: user.points || 0,
          totalEarnings: user.totalEarnings || 0,
          periodPoints: periodPoints
        };
      }).filter(Boolean); // Убираем null значения
      
      // Сортируем по очкам за период и ограничиваем количество
      leaderboard = periodStats
        .sort((a, b) => b.periodPoints - a.periodPoints)
        .slice(0, limit);
    }

    // Добавить позицию в рейтинге
    const leaderboardWithRank = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1
    }))

    // Найти позицию текущего пользователя
    let userRank = null
    const bartenderRoleIds = await getBartenderRoleIds();
    if (req.user.role && bartenderRoleIds.map(id => id.toString()).includes(req.user.role.toString())) {
      console.log('=== LEADERBOARD USER RANK DEBUG ===')
      console.log('Current user ID:', req.user.id)
      console.log('Leaderboard users:', leaderboardWithRank.map(u => ({ id: u._id?.toString() || u._id, name: u.name })))
      
      const userIndex = leaderboardWithRank.findIndex(user => {
        const userId = user._id?.toString() || user._id
        console.log('Comparing leaderboard user:', userId, 'with current user:', req.user.id)
        return userId === req.user.id.toString()
      })
      
      console.log('User index in leaderboard:', userIndex)
      
      if (userIndex !== -1) {
        userRank = userIndex + 1
        console.log('User found in leaderboard, rank:', userRank)
      } else {
        console.log('User not in leaderboard, calculating position...')
        // Если пользователь не в топе, найти его реальную позицию
        let totalUsers
        if (period === 'all') {
          const currentUserPoints = req.user.points || 0
          console.log('Current user points:', currentUserPoints)
          
          // Подсчитываем пользователей с большим количеством очков
          const bartenderRoleIds = await getBartenderRoleIds();
          const users = await User.find({ role: { $in: bartenderRoleIds } });
          const activeUsers = users.filter(user => user.isActive !== false);
          totalUsers = activeUsers.filter(user => (user.points || 0) > currentUserPoints).length;
          
          console.log('Users with more points:', totalUsers)
        } else {
          // Для периодических рейтингов нужно более сложный запрос
          totalUsers = null
        }
        userRank = totalUsers !== null ? totalUsers + 1 : null
        console.log('Final calculated rank:', userRank)
      }
      console.log('=== END LEADERBOARD USER RANK DEBUG ===')
    }

    res.json({
      leaderboard: leaderboardWithRank,
      userRank,
      period,
      total: leaderboardWithRank.length
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   GET /api/gamification/prizes
// @desc    Получить доступные призы
// @access  Private
router.get('/prizes', auth, async (req, res) => {
  try {
    const category = req.query.category
    const available = req.query.available === 'true'

    let query = { isActive: true }
    if (category) query.category = category
    if (available) query.quantity = { $gt: 0 }

    const prizes = await Prize.find(query)
    
    // Сортировка для файлового хранилища
    const sortedPrizes = prizes.sort((a, b) => a.cost - b.cost)

    // Добавить информацию о доступности для пользователя
    const prizesWithAvailability = sortedPrizes.map(prize => ({
      ...prize.toObject(),
      canAfford: req.user.points >= prize.cost,
      isAvailable: prize.quantity > 0
    }))

    res.json(prizesWithAvailability)
  } catch (error) {
    console.error('Ошибка при получении призов:', error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   POST /api/gamification/cart/add/:prizeId
// @desc    Добавить приз в корзину
// @access  Private
router.post('/cart/add/:prizeId', auth, async (req, res) => {
  try {
    const { quantity = 1 } = req.body
    
    const prize = await Prize.findById(req.params.prizeId)
    if (!prize) {
      return res.status(404).json({ msg: 'Приз не найден' })
    }

    if (!prize.isActive) {
      return res.status(400).json({ msg: 'Приз недоступен' })
    }

    if (prize.quantity < quantity) {
      return res.status(400).json({ msg: 'Недостаточно призов в наличии' })
    }

    let cart = await Cart.findOne({ user: req.user.id })
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] })
    }

    cart.addItem(prize._id, quantity, prize.cost)
    await cart.save()
    
    // Получаем обновленную корзину с заполненными данными призов
    const updatedCart = await Cart.findOne({ user: req.user.id }).populate('items.prize')
    
    res.json({
      msg: 'Приз добавлен в корзину',
      cart: {
        items: updatedCart.items,
        totalCost: updatedCart.totalCost
      }
    })
  } catch (error) {
    console.error('Ошибка добавления в корзину:', error)
    console.error(error.stack)
    res.status(500).json({ error: 'Ошибка сервера', details: error.message })
  }
})

// @route   GET /api/gamification/cart
// @desc    Получить содержимое корзины
// @access  Private
router.get('/cart', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.prize')
    
    if (!cart || cart.items.length === 0) {
      return res.json({
        items: [],
        totalCost: 0
      })
    }

    res.json({
      items: cart.items,
      totalCost: cart.totalCost
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   PUT /api/gamification/cart/update/:prizeId
// @desc    Обновить количество приза в корзине
// @access  Private
router.put('/cart/update/:prizeId', auth, async (req, res) => {
  try {
    const { quantity } = req.body
    
    if (quantity < 0) {
      return res.status(400).json({ msg: 'Количество не может быть отрицательным' })
    }

    const cart = await Cart.findOne({ user: req.user.id })
    if (!cart) {
      return res.status(404).json({ msg: 'Корзина не найдена' })
    }

    if (quantity === 0) {
      await cart.removeItem(req.params.prizeId)
    } else {
      const prize = await Prize.findById(req.params.prizeId)
      if (!prize) {
        return res.status(404).json({ msg: 'Приз не найден' })
      }
      
      if (prize.quantity < quantity) {
        return res.status(400).json({ msg: 'Недостаточно призов в наличии' })
      }

      await cart.updateQuantity(req.params.prizeId, quantity)
    }

    res.json({
      msg: 'Корзина обновлена',
      cart: {
        items: cart.items,
        totalCost: cart.totalCost
      }
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   DELETE /api/gamification/cart/remove/:prizeId
// @desc    Удалить приз из корзины
// @access  Private
router.delete('/cart/remove/:prizeId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
    if (!cart) {
      return res.status(404).json({ msg: 'Корзина не найдена' })
    }

    await cart.removeItem(req.params.prizeId)

    res.json({
      msg: 'Приз удален из корзины',
      cart: {
        items: cart.items,
        totalCost: cart.totalCost
      }
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   DELETE /api/gamification/cart/clear
// @desc    Очистить корзину
// @access  Private
router.delete('/cart/clear', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
    if (cart) {
      await cart.clearCart()
    }

    res.json({ msg: 'Корзина очищена' })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   POST /api/gamification/cart/checkout
// @desc    Оформить заказ из корзины
// @access  Private
router.post('/cart/checkout', auth, async (req, res) => {
  try {
    const { deliveryAddress, notes } = req.body
    
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.prize')
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ msg: 'Корзина пуста' })
    }

    const user = await User.findById(req.user.id)
    if (user.points < cart.totalCost) {
      return res.status(400).json({ msg: 'Недостаточно баллов для оформления заказа' })
    }

    // Проверить наличие всех призов
    for (const item of cart.items) {
      const prize = await Prize.findById(item.prize._id)
      if (!prize || !prize.isActive) {
        return res.status(400).json({ msg: `Приз "${item.prize.name}" недоступен` })
      }
      if (prize.quantity < item.quantity) {
        return res.status(400).json({ msg: `Недостаточно призов "${item.prize.name}" в наличии` })
      }
    }

    // Создать заказ
    const order = new Order({
      user: req.user.id,
      items: cart.items.map(item => ({
        prize: item.prize._id,
        quantity: item.quantity,
        priceAtTime: item.priceAtTime,
        prizeName: item.prize.name,
        prizeDescription: item.prize.description
      })),
      totalCost: cart.totalCost,
      deliveryAddress,
      notes,
      status: 'pending'
    })

    // Установить предполагаемую дату доставки (7 дней)
    order.estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    
    await order.save()

    // Списать баллы
    await User.findByIdAndUpdate(req.user.id, { 
      $inc: { points: -cart.totalCost } 
    })

    // Уменьшить количество призов
    for (const item of cart.items) {
      await Prize.findByIdAndUpdate(item.prize._id, { 
        $inc: { quantity: -item.quantity } 
      })
    }

    // Создать транзакцию
    const transaction = await Transaction.create({
      user: req.user.id,
      transactionId: `order_${order.orderNumber}_${Date.now()}`,
      type: 'redemption',
      amount: cart.totalCost,
      netAmount: cart.totalCost,
      status: 'completed',
      method: 'points',
      details: {
        description: `Заказ призов: ${order.orderNumber}`,
        orderNumber: order.orderNumber,
        itemsCount: cart.items.length
      },
      relatedOrder: order._id
    })

    // Связать транзакцию с заказом
    order.transaction = transaction._id
    await order.save()

    // Очистить корзину
    await cart.clearCart()

    res.json({
      msg: 'Заказ успешно оформлен!',
      order: {
        orderNumber: order.orderNumber,
        totalCost: order.totalCost,
        status: order.status,
        estimatedDelivery: order.estimatedDelivery,
        items: order.items
      },
      remainingPoints: (await User.findById(req.user.id)).points,
      transaction: transaction._id
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   GET /api/gamification/orders
// @desc    Получить историю заказов пользователя
// @access  Private
router.get('/orders', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('transaction')

    const total = await Order.countDocuments({ user: req.user.id })

    res.json({
      orders,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   GET /api/gamification/orders/:orderId
// @desc    Получить детали заказа
// @access  Private
router.get('/orders/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.orderId, 
      user: req.user.id 
    }).populate('transaction')

    if (!order) {
      return res.status(404).json({ msg: 'Заказ не найден' })
    }

    res.json(order)
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   PUT /api/gamification/orders/:orderId
// @desc    Обновить информацию о доставке заказа
// @access  Private
router.put('/orders/:orderId', auth, async (req, res) => {
  try {
    const { deliveryAddress, notes } = req.body

    const order = await Order.findOne({ 
      _id: req.params.orderId, 
      user: req.user.id 
    })

    if (!order) {
      return res.status(404).json({ message: 'Заказ не найден' })
    }

    // Only allow updates for certain statuses
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ message: 'Нельзя изменить информацию о доставке для этого заказа' })
    }

    order.deliveryAddress = deliveryAddress
    order.notes = notes
    await order.save()

    res.json({ message: 'Информация о доставке обновлена', order })
  } catch (error) {
    console.error('Ошибка обновления заказа:', error)
    res.status(500).json({ message: 'Ошибка сервера' })
  }
})

// @route   POST /api/gamification/orders/:orderId/cancel
// @desc    Отменить заказ
// @access  Private
router.post('/orders/:orderId/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body
    
    const order = await Order.findOne({ 
      _id: req.params.orderId, 
      user: req.user.id 
    })

    if (!order) {
      return res.status(404).json({ msg: 'Заказ не найден' })
    }

    if (!order.canBeCancelled()) {
      return res.status(400).json({ msg: 'Заказ нельзя отменить в текущем статусе' })
    }

    // Отменить заказ
    order.cancel(reason || 'Отменено пользователем')
    await order.save()

    // Вернуть баллы пользователю
    await User.findByIdAndUpdate(req.user.id, { 
      $inc: { points: order.totalCost } 
    })

    // Вернуть призы в наличие
    for (const item of order.items) {
      await Prize.findByIdAndUpdate(item.prize, { 
        $inc: { quantity: item.quantity } 
      })
    }

    // Создать транзакцию возврата
    const refundTransaction = await Transaction.create({
      user: req.user.id,
      transactionId: `refund_${order.orderNumber}_${Date.now()}`,
      type: 'refund',
      amount: order.totalCost,
      netAmount: order.totalCost,
      status: 'completed',
      method: 'points',
      details: {
        description: `Возврат за отмененный заказ: ${order.orderNumber}`,
        originalOrder: order.orderNumber
      },
      relatedOrder: order._id
    })

    res.json({
      msg: 'Заказ успешно отменен',
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        refundAmount: order.totalCost
      },
      remainingPoints: (await User.findById(req.user.id)).points,
      refundTransaction: refundTransaction._id
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   POST /api/gamification/redeem/:prizeId (DEPRECATED - use cart system instead)
// @desc    Прямой обмен приза (оставлено для совместимости)
// @access  Private
router.post('/redeem/:prizeId', auth, async (req, res) => {
  try {
    const prize = await Prize.findById(req.params.prizeId)
    if (!prize) {
      return res.status(404).json({ msg: 'Приз не найден' })
    }

    if (!prize.isActive) {
      return res.status(400).json({ msg: 'Приз недоступен' })
    }

    if (prize.quantity <= 0) {
      return res.status(400).json({ msg: 'Приз закончился' })
    }

    const user = await User.findById(req.user.id)
    if (user.points < prize.cost) {
      return res.status(400).json({ msg: 'Недостаточно баллов' })
    }

    // Списать баллы
    await User.findByIdAndUpdate(req.user.id, { 
      $inc: { points: -prize.cost } 
    })

    // Уменьшить количество призов
    await Prize.findByIdAndUpdate(req.params.prizeId, { 
      $inc: { quantity: -1 } 
    })

    // Создать транзакцию
    const transaction = await Transaction.create({
      user: req.user.id,
      transactionId: `redemption_${Date.now()}_${req.user.id}`,
      type: 'redemption',
      amount: prize.cost,
      netAmount: prize.cost,
      status: 'completed',
      method: 'points',
      details: {
        description: `Обмен на приз: ${prize.name}`
      },
      relatedPrize: prize._id
    })

    res.json({
      msg: 'Приз успешно получен!',
      prize: {
        name: prize.name,
        description: prize.description,
        pointsCost: prize.cost
      },
      remainingPoints: (await User.findById(req.user.id)).points,
      transaction: transaction._id
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   GET /api/gamification/achievements
// @desc    Получить достижения пользователя
// @access  Private
router.get('/achievements', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    const userTransactions = await Transaction.find({ user: req.user.id })

    // Подсчитать статистику для достижений
    const stats = {
      totalSales: userTransactions.filter(t => t.type === 'earning').length,
      totalPoints: user.points + userTransactions
        .filter(t => t.type === 'redemption')
        .reduce((sum, t) => sum + t.amount, 0),
      totalRedemptions: userTransactions.filter(t => t.type === 'redemption').length,
      consecutiveDays: 0, // TODO: Реализовать подсчет последовательных дней
      monthlyGoals: 0 // TODO: Реализовать месячные цели
    }

    // Определить достижения
    const achievements = [
      {
        id: 'first_sale',
        name: 'Первая продажа',
        description: 'Добавьте свою первую продажу',
        icon: '🎯',
        unlocked: stats.totalSales >= 1,
        progress: Math.min(stats.totalSales, 1),
        target: 1
      },
      {
        id: 'sales_10',
        name: 'Активный продавец',
        description: 'Совершите 10 продаж',
        icon: '🔥',
        unlocked: stats.totalSales >= 10,
        progress: Math.min(stats.totalSales, 10),
        target: 10
      },
      {
        id: 'sales_50',
        name: 'Профессионал',
        description: 'Совершите 50 продаж',
        icon: '⭐',
        unlocked: stats.totalSales >= 50,
        progress: Math.min(stats.totalSales, 50),
        target: 50
      },
      {
        id: 'sales_100',
        name: 'Мастер продаж',
        description: 'Совершите 100 продаж',
        icon: '👑',
        unlocked: stats.totalSales >= 100,
        progress: Math.min(stats.totalSales, 100),
        target: 100
      },
      {
        id: 'points_1000',
        name: 'Коллекционер баллов',
        description: 'Накопите 1000 баллов',
        icon: '💎',
        unlocked: stats.totalPoints >= 1000,
        progress: Math.min(stats.totalPoints, 1000),
        target: 1000
      },
      {
        id: 'points_5000',
        name: 'Магнат баллов',
        description: 'Накопите 5000 баллов',
        icon: '💰',
        unlocked: stats.totalPoints >= 5000,
        progress: Math.min(stats.totalPoints, 5000),
        target: 5000
      },
      {
        id: 'first_redemption',
        name: 'Первый приз',
        description: 'Обменяйте баллы на первый приз',
        icon: '🎁',
        unlocked: stats.totalRedemptions >= 1,
        progress: Math.min(stats.totalRedemptions, 1),
        target: 1
      }
    ]

    const unlockedCount = achievements.filter(a => a.unlocked).length
    const totalCount = achievements.length

    res.json({
      achievements,
      summary: {
        unlocked: unlockedCount,
        total: totalCount,
        percentage: Math.round((unlockedCount / totalCount) * 100)
      },
      stats
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   GET /api/gamification/lottery
// @desc    Получить информацию о текущей лотерее
// @access  Private
router.get('/lottery', auth, async (req, res) => {
  try {
    // Простая лотерея - каждый месяц разыгрывается приз среди активных пользователей
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // Get bartender role ID
    const bartenderRoleId = await getBartenderRoleId();
    
    // Найти пользователей, которые были активны в этом месяце
    const startOfMonth = new Date(currentYear, currentMonth, 1)
    const activeUsers = await Transaction.aggregate([
      {
        $match: {
          type: 'earning',
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: '$user',
          monthlyPoints: { $sum: '$amount' },
          salesCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $match: {
          'user.role': bartenderRoleId,
          'user.isActive': true,
          monthlyPoints: { $gte: 100 } // Минимум 100 баллов для участия
        }
      },
      {
        $project: {
          name: '$user.name',
          bar: '$user.bar',
          city: '$user.city',
          monthlyPoints: 1,
          salesCount: 1,
          tickets: { $floor: { $divide: ['$monthlyPoints', 100] } } // 1 билет за каждые 100 баллов
        }
      },
      {
        $sort: { monthlyPoints: -1 }
      }
    ])

    const totalTickets = activeUsers.reduce((sum, user) => sum + user.tickets, 0)
    const userParticipation = activeUsers.find(user => user._id.toString() === req.user.id)

    // Определить дату окончания лотереи (последний день месяца)
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)

    res.json({
      isActive: true,
      endDate: endOfMonth,
      prize: {
        name: 'Главный приз месяца',
        description: 'Специальный приз для самого активного бармена',
        value: '10000 баллов + подарок от партнера'
      },
      participants: activeUsers.length,
      totalTickets,
      userTickets: userParticipation?.tickets || 0,
      userChance: totalTickets > 0 ? ((userParticipation?.tickets || 0) / totalTickets * 100).toFixed(2) : 0,
      requirements: {
        minPoints: 100,
        description: 'Наберите минимум 100 баллов в текущем месяце для участия'
      },
      topParticipants: activeUsers.slice(0, 10)
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   GET /api/gamification/stats
// @desc    Получить общую статистику геймификации
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const bartenderRoleId = await getBartenderRoleId();
    
    // Get user details
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Get user transactions
    const userTransactions = await Transaction.find({ user: req.user.id });
    
    const totalEarnings = userTransactions
      .filter(t => t.type === 'earning')
      .reduce((sum, t) => sum + t.points, 0);

    // Calculate user rank among active bartenders
    const activeUsers = await User.find({ 
      role: bartenderRoleId,
      isActive: { $ne: false }
    });
    
    const userSales = userTransactions.filter(t => t.type === 'earning')
    const userRedemptions = userTransactions.filter(t => t.type === 'redemption')

    // Позиция в общем рейтинге
    const betterUsers = await User.countDocuments({
      role: bartenderRoleId,
      isActive: true,
      points: { $gt: user.points }
    })
    const userRank = betterUsers + 1

    // Статистика за текущий месяц
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthlyTransactions = userTransactions.filter(t => t.createdAt >= startOfMonth && t.type === 'earning')
    const monthlyPoints = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0)

    // Прогресс до следующего уровня (каждые 1000 баллов = новый уровень)
    const currentLevel = Math.floor(user.points / 1000) + 1
    const pointsForNextLevel = (currentLevel * 1000) - user.points
    const progressToNextLevel = ((user.points % 1000) / 1000) * 100

    res.json({
      user: {
        points: user.points,
        totalEarnings: user.totalEarnings,
        rank: userRank,
        level: currentLevel,
        pointsForNextLevel,
        progressToNextLevel: Math.round(progressToNextLevel)
      },
      monthly: {
        points: monthlyPoints,
        sales: monthlyTransactions.length
      },
      allTime: {
        sales: userSales.length,
        redemptions: userRedemptions.length,
        totalPointsEarned: userSales.reduce((sum, t) => sum + t.amount, 0),
        totalPointsSpent: userRedemptions.reduce((sum, t) => sum + t.amount, 0)
      },
      milestones: {
        nextSalesMilestone: getNextMilestone(userSales.length, [10, 25, 50, 100, 250, 500]),
        nextPointsMilestone: getNextMilestone(user.points, [500, 1000, 2500, 5000, 10000, 25000])
      }
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// Вспомогательная функция для определения следующего рубежа
function getNextMilestone(current, milestones) {
  const next = milestones.find(m => m > current)
  return next ? {
    target: next,
    progress: current,
    remaining: next - current,
    percentage: Math.round((current / next) * 100)
  } : null
}

module.exports = router