const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { getModel } = require('../models/ModelFactory')
const User = getModel('User')
const Transaction = getModel('Transaction')
const crypto = require('crypto')

// Конфигурация для SBP (Система быстрых платежей)
const SBP_CONFIG = {
  merchantId: process.env.SBP_MERCHANT_ID || 'test_merchant',
  secretKey: process.env.SBP_SECRET_KEY || 'test_secret_key',
  apiUrl: process.env.SBP_API_URL || 'https://api.sbp.ru/v1',
  minWithdrawAmount: 100, // Минимальная сумма для вывода в рублях
  maxWithdrawAmount: 50000, // Максимальная сумма для вывода в рублях
  commissionRate: 0.02 // Комиссия 2%
}

// @route   GET /api/payments/balance
// @desc    Получить баланс пользователя
// @access  Private
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('totalEarnings points')
    
    // Подсчитать доступную сумму для вывода
    const withdrawnAmount = await Transaction.aggregate([
      {
        $match: {
          user: req.user.id,
          type: 'withdrawal',
          status: { $in: ['completed', 'pending'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ])

    const totalWithdrawn = withdrawnAmount.length > 0 ? withdrawnAmount[0].total : 0
    const availableBalance = Math.max(0, user.totalEarnings - totalWithdrawn)

    res.json({
      totalEarnings: user.totalEarnings,
      availableBalance,
      withdrawnAmount: totalWithdrawn,
      points: user.points,
      minWithdrawAmount: SBP_CONFIG.minWithdrawAmount,
      maxWithdrawAmount: SBP_CONFIG.maxWithdrawAmount,
      commissionRate: SBP_CONFIG.commissionRate
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).send('Ошибка сервера')
  }
})

// @route   POST /api/payments/withdraw
// @desc    Создать запрос на вывод средств
// @access  Private
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, phoneNumber, bankName } = req.body

    // Валидация
    if (!amount || !phoneNumber) {
      return res.status(400).json({ msg: 'Укажите сумму и номер телефона' })
    }

    if (amount < SBP_CONFIG.minWithdrawAmount) {
      return res.status(400).json({ 
        msg: `Минимальная сумма для вывода: ${SBP_CONFIG.minWithdrawAmount} ₽` 
      })
    }

    if (amount > SBP_CONFIG.maxWithdrawAmount) {
      return res.status(400).json({ 
        msg: `Максимальная сумма для вывода: ${SBP_CONFIG.maxWithdrawAmount} ₽` 
      })
    }

    // Проверить баланс пользователя
    const user = await User.findById(req.user.id)
    const withdrawnAmount = await Transaction.aggregate([
      {
        $match: {
          user: req.user.id,
          type: 'withdrawal',
          status: { $in: ['completed', 'pending'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ])

    const totalWithdrawn = withdrawnAmount.length > 0 ? withdrawnAmount[0].total : 0
    const availableBalance = user.totalEarnings - totalWithdrawn

    if (amount > availableBalance) {
      return res.status(400).json({ 
        msg: `Недостаточно средств. Доступно: ${availableBalance} ₽` 
      })
    }

    // Рассчитать комиссию
    const commission = Math.round(amount * SBP_CONFIG.commissionRate)
    const amountToReceive = amount - commission

    // Создать транзакцию
    const transaction = new Transaction({
      user: req.user.id,
      type: 'withdrawal',
      amount: amount,
      commission: commission,
      amountToReceive: amountToReceive,
      status: 'pending',
      description: `Вывод средств через СБП на номер ${phoneNumber}`,
      paymentDetails: {
        phoneNumber,
        bankName: bankName || 'Не указан',
        method: 'sbp'
      },
      externalId: generateTransactionId()
    })

    await transaction.save()

    // В реальном приложении здесь был бы вызов API СБП
    // Для демонстрации просто имитируем обработку
    setTimeout(async () => {
      try {
        // Имитация обработки платежа
        const success = Math.random() > 0.1 // 90% успешных платежей для демо

        if (success) {
          await Transaction.findByIdAndUpdate(transaction._id, {
            status: 'completed',
            processedAt: new Date(),
            externalTransactionId: `sbp_${Date.now()}`
          })
        } else {
          await Transaction.findByIdAndUpdate(transaction._id, {
            status: 'failed',
            processedAt: new Date(),
            failureReason: 'Ошибка обработки платежа'
          })
        }
      } catch (error) {
        console.error('Ошибка при создании платежа:', error.message)
        res.status(500).json({ error: 'Ошибка сервера' })
      }
    }, 5000) // Имитация задержки обработки

    res.json({
      msg: 'Запрос на вывод средств создан',
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        commission: transaction.commission,
        amountToReceive: transaction.amountToReceive,
        status: transaction.status,
        phoneNumber: transaction.paymentDetails.phoneNumber,
        estimatedProcessingTime: '5-10 минут'
      }
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).send('Ошибка сервера')
  }
})

// @route   GET /api/payments/transactions
// @desc    Получить историю транзакций пользователя
// @access  Private
router.get('/transactions', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const type = req.query.type // earning, withdrawal, redemption
    const status = req.query.status // pending, completed, failed

    let query = { user: req.user.id }
    if (type) query.type = type
    if (status) query.status = status

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('relatedSale', 'product brand amount')
      .populate('relatedPrize', 'name cost')

    const total = await Transaction.countDocuments(query)

    // Группировка по типам для статистики
    const stats = await Transaction.aggregate([
      { $match: { user: req.user.id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ])

    const statsFormatted = stats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        totalAmount: stat.totalAmount
      }
      return acc
    }, {})

    res.json({
      transactions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      },
      stats: statsFormatted
    })
  } catch (error) {
    console.error('Ошибка при получении платежей:', error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   GET /api/payments/transaction/:id
// @desc    Получить детали конкретной транзакции
// @access  Private
router.get('/transaction/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    })
      .populate('relatedSale', 'product brand amount receipt')
      .populate('relatedPrize', 'name description cost')

    if (!transaction) {
      return res.status(404).json({ msg: 'Транзакция не найдена' })
    }

    res.json(transaction)
  } catch (error) {
    console.error(error.message)
    res.status(500).send('Ошибка сервера')
  }
})

// @route   POST /api/payments/cancel-withdrawal/:id
// @desc    Отменить запрос на вывод средств (только если статус pending)
// @access  Private
router.post('/cancel-withdrawal/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
      type: 'withdrawal'
    })

    if (!transaction) {
      return res.status(404).json({ msg: 'Транзакция не найдена' })
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ 
        msg: 'Можно отменить только ожидающие обработки запросы' 
      })
    }

    transaction.status = 'cancelled'
    transaction.processedAt = new Date()
    transaction.failureReason = 'Отменено пользователем'
    await transaction.save()

    res.json({
      msg: 'Запрос на вывод средств отменен',
      transaction
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).send('Ошибка сервера')
  }
})

// @route   GET /api/payments/methods
// @desc    Получить доступные методы вывода
// @access  Private
router.get('/methods', auth, async (req, res) => {
  try {
    const methods = [
      {
        id: 'sbp',
        name: 'Система быстрых платежей (СБП)',
        description: 'Мгновенные переводы по номеру телефона',
        icon: '💳',
        processingTime: '5-10 минут',
        commission: SBP_CONFIG.commissionRate,
        minAmount: SBP_CONFIG.minWithdrawAmount,
        maxAmount: SBP_CONFIG.maxWithdrawAmount,
        isActive: true,
        requirements: [
          'Номер телефона, привязанный к банковской карте',
          'Банк должен поддерживать СБП'
        ]
      }
    ]

    res.json(methods)
  } catch (error) {
    console.error(error.message)
    res.status(500).send('Ошибка сервера')
  }
})

// Вспомогательная функция для генерации ID транзакции
function generateTransactionId() {
  return 'TXN_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex').toUpperCase()
}

// Webhook для обработки уведомлений от СБП (в реальном приложении)
// @route   POST /api/payments/webhook/sbp
// @desc    Webhook для уведомлений от СБП
// @access  Public (но с проверкой подписи)
router.post('/webhook/sbp', async (req, res) => {
  try {
    // В реальном приложении здесь должна быть проверка подписи
    const { transactionId, status, externalTransactionId } = req.body

    const transaction = await Transaction.findOne({ externalId: transactionId })
    if (!transaction) {
      return res.status(404).json({ msg: 'Транзакция не найдена' })
    }

    transaction.status = status
    transaction.processedAt = new Date()
    if (externalTransactionId) {
      transaction.externalTransactionId = externalTransactionId
    }

    await transaction.save()

    res.json({ msg: 'Webhook обработан' })
  } catch (error) {
    console.error('Ошибка при обработке webhook:', error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

module.exports = router