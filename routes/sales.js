const express = require('express')
const router = express.Router()
const { getModel } = require('../models/ModelFactory')
const Sale = getModel('Sale')
const User = getModel('User')
const Product = getModel('Product')
const Transaction = getModel('Transaction')
const auth = require('../middleware/auth')
const multer = require('multer')
const path = require('path')
const mongoose = require('mongoose')

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/receipts/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Разрешены только изображения (JPEG, PNG) и PDF файлы'))
    }
  }
})

// @route   POST /api/sales
// @desc    Add new sale
// @access  Private
router.post('/', auth, upload.single('receipt'), async (req, res) => {
  try {
    const { productId, product, brand, quantity, proofType } = req.body

    // Validate required fields
    if (!productId || !quantity) {
      return res.status(400).json({ msg: 'Пожалуйста, заполните все обязательные поля' })
    }

    // Find the specific product by ID for accurate point calculation
    const productInDb = await Product.findById(productId)
    
    if (!productInDb || !productInDb.isActive) {
      return res.status(400).json({ msg: 'Выбранный продукт не найден или неактивен' })
    }

    // Calculate price based on portions sold and bottle price
    const portionsSold = parseInt(quantity)
    const pricePerPortion = productInDb.bottlePrice / productInDb.portionsPerBottle
    const totalAmount = pricePerPortion * portionsSold

    // Calculate points based on product settings
    let pointsEarned = 0

    // Use product-specific point calculation based on calculation type
    switch (productInDb.pointsCalculationType) {
      case 'per_portion':
        // Расчет по порциям (например, для джина)
        pointsEarned = portionsSold * productInDb.pointsPerPortion
        break
      case 'per_volume':
        // Расчет по объему (будущая функциональность)
        pointsEarned = Math.floor(totalAmount * productInDb.pointsPerRuble)
        break
      case 'per_ruble':
      default:
        // Расчет по рублям (стандартный)
        pointsEarned = Math.floor(totalAmount * productInDb.pointsPerRuble)
        break
    }

    // Ensure user ID is a valid ObjectId
    const mongoose = require('mongoose')
    let userId = req.user.id // Используем оригинальный ID пользователя

    // Prepare proof data
    let proofData = {}
    if (proofType === 'receipt' && req.file) {
      proofData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      }
    } else if (proofType === 'photo' && req.file) {
      proofData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      }
    }

    // Create new sale
    const sale = new Sale({
      user: userId,
      bar: req.user.bar,
      product: productInDb.name,
      brand: productInDb.brand,
      quantity: parseInt(quantity),
      price: totalAmount, // Use calculated price instead of manual input
      pointsEarned,
      proofType: proofType || 'receipt',
      proofData,
      verificationStatus: 'pending'
    })

    await sale.save()

    // Update user points (pending verification)
    const user = await User.findById(req.user.id)
    if (user) {
      user.points = (user.points || 0) + pointsEarned
      user.totalEarnings = (user.totalEarnings || 0) + pointsEarned
      await user.save()
    }

    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      transactionId: `sale_${sale._id}_${Date.now()}`,
      type: 'earning',
      amount: pointsEarned,
      netAmount: pointsEarned,
      status: 'pending',
      details: {
        description: `Продажа ${productInDb.name} (${productInDb.brand})`
      }
    })

    await transaction.save()

    res.json({
      msg: 'Продажа успешно добавлена и ожидает проверки',
      sale,
      pointsEarned
    })

  } catch (error) {
    console.error('Ошибка при создании продажи:', error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   GET /api/sales
// @desc    Get user's sales
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const sales = await Sale.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')

    const total = await Sale.countDocuments({ user: req.user.id })

    res.json({
      sales,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    })

  } catch (error) {
    console.error('Ошибка при получении продаж:', error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   GET /api/sales/stats
// @desc    Get user's sales statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id

    // Get current month stats
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    console.log('=== MONTHLY STATS DEBUG ===')
    console.log('Current month start:', currentMonth)
    console.log('User ID for monthly stats:', userId)

    // Для файловой базы данных используем простой поиск
    const allSales = await Sale.find({ user: userId });
    const monthlySales = allSales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= currentMonth;
    });

    const monthlyStats = [{
      _id: null,
      totalSales: monthlySales.length,
      totalAmount: monthlySales.reduce((sum, sale) => sum + (sale.price || 0), 0),
      totalPoints: monthlySales.reduce((sum, sale) => sum + (sale.pointsEarned || 0), 0)
    }];

    console.log('Monthly stats result:', JSON.stringify(monthlyStats, null, 2))
    console.log('=== END MONTHLY STATS DEBUG ===')

    // Get all-time stats with status filtering
    const approvedSales = allSales.filter(sale => sale.verificationStatus === 'approved').length;
    const pendingSales = allSales.filter(sale => sale.verificationStatus === 'pending').length;
    const rejectedSales = allSales.filter(sale => sale.verificationStatus === 'rejected').length;

    const allTimeStats = [{
      _id: null,
      totalSales: allSales.length,
      totalAmount: allSales.reduce((sum, sale) => sum + (sale.price || 0), 0),
      totalPoints: allSales.reduce((sum, sale) => sum + (sale.pointsEarned || 0), 0),
      approvedAmount: allSales.filter(sale => sale.verificationStatus === 'approved').reduce((sum, sale) => sum + (sale.price || 0), 0),
      pendingAmount: allSales.filter(sale => sale.verificationStatus === 'pending').reduce((sum, sale) => sum + (sale.price || 0), 0),
      rejectedAmount: allSales.filter(sale => sale.verificationStatus === 'rejected').reduce((sum, sale) => sum + (sale.price || 0), 0)
    }];

    // Get recent sales
    const recentSales = allSales
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(sale => ({
        product: sale.product,
        brand: sale.brand,
        price: sale.price,
        pointsEarned: sale.pointsEarned,
        createdAt: sale.createdAt,
        verificationStatus: sale.verificationStatus
      }));

    // Get brand breakdown
    const brandMap = new Map();
    allSales.forEach(sale => {
      const brand = sale.brand;
      if (!brandMap.has(brand)) {
        brandMap.set(brand, { count: 0, totalAmount: 0, totalPoints: 0 });
      }
      const stats = brandMap.get(brand);
      stats.count += 1;
      stats.totalAmount += sale.price || 0;
      stats.totalPoints += sale.pointsEarned || 0;
    });

    const brandStats = Array.from(brandMap.entries())
      .map(([brand, stats]) => ({ _id: brand, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get status breakdown
    const statusStats = [
      { _id: 'approved', count: approvedSales },
      { _id: 'pending', count: pendingSales },
      { _id: 'rejected', count: rejectedSales }
    ].filter(stat => stat.count > 0);

    // Calculate monthly rank
    let monthlyRank = 0;
    try {
      console.log('=== MONTHLY RANK DEBUG ===')
      console.log('Current month:', currentMonth)
      console.log('User ID:', userId)
      
      // Get all users' monthly sales for ranking
      const { collections } = require('../config/db');
      const allSalesData = Array.from(collections.sales.values());
      
      // Group sales by user for the current month
      const userMonthlyStats = new Map();
      
      allSalesData.forEach(sale => {
        if (new Date(sale.createdAt) >= currentMonth && sale.verificationStatus === 'approved') {
          const saleUserId = sale.user;
          if (!userMonthlyStats.has(saleUserId)) {
            userMonthlyStats.set(saleUserId, { monthlyAmount: 0, monthlySales: 0 });
          }
          const stats = userMonthlyStats.get(saleUserId);
          stats.monthlyAmount += sale.price || 0;
          stats.monthlySales += 1;
        }
      });

      // Convert to array and sort by monthly amount
      const monthlyRanking = Array.from(userMonthlyStats.entries())
        .map(([userId, stats]) => ({ _id: userId, ...stats }))
        .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

      console.log('Monthly ranking results:', JSON.stringify(monthlyRanking, null, 2))

      // Find current user's position
      const userIndex = monthlyRanking.findIndex(user => {
        console.log('Comparing:', user._id.toString(), 'with', userId.toString())
        return user._id.toString() === userId.toString()
      })
      
      monthlyRank = userIndex !== -1 ? userIndex + 1 : 0
      console.log('User index:', userIndex, 'Monthly rank:', monthlyRank)
      console.log('=== END MONTHLY RANK DEBUG ===')
    } catch (error) {
      console.error('Error calculating monthly rank:', error)
      monthlyRank = 0
    }

    const allTimeData = allTimeStats[0] || { 
      totalSales: 0, 
      totalAmount: 0, 
      totalPoints: 0,
      approvedAmount: 0,
      pendingAmount: 0,
      rejectedAmount: 0
    }

    res.json({
      totalSales: allTimeData.totalSales,
      totalAmount: allTimeData.totalAmount,
      approvedAmount: allTimeData.approvedAmount,
      pendingAmount: allTimeData.pendingAmount,
      rejectedAmount: allTimeData.rejectedAmount,
      totalPoints: allTimeData.totalPoints,
      approvedSales,
      pendingSales,
      rejectedSales,
      monthlyRank,
      monthly: monthlyStats[0] || { totalSales: 0, totalAmount: 0, totalPoints: 0 },
      allTime: allTimeData,
      recentSales,
      brandStats,
      statusStats
    })

  } catch (error) {
    console.error(error.message)
    res.status(500).send('Ошибка сервера')
  }
})

// @route   GET /api/sales/:id
// @desc    Get specific sale
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('user', 'name email')

    if (!sale) {
      return res.status(404).json({ msg: 'Продажа не найдена' })
    }

    // Check if user owns this sale or is admin
    if (sale.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Доступ запрещен' })
    }

    res.json(sale)

  } catch (error) {
    console.error(error.message)
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Продажа не найдена' })
    }
    res.status(500).send('Ошибка сервера')
  }
})

// @route   PUT /api/sales/:id
// @desc    Update sale (for admin verification)
// @access  Private (Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Доступ запрещен' })
    }

    const { verificationStatus, adminNotes } = req.body

    const sale = await Sale.findById(req.params.id)

    if (!sale) {
      return res.status(404).json({ msg: 'Продажа не найдена' })
    }

    // Update sale
    sale.verificationStatus = verificationStatus || sale.verificationStatus
    sale.adminNotes = adminNotes || sale.adminNotes
    sale.verifiedAt = verificationStatus === 'approved' ? new Date() : sale.verifiedAt

    await sale.save()

    // Update related transaction
    if (verificationStatus === 'approved') {
      await Transaction.findOneAndUpdate(
        { relatedSale: sale._id },
        { status: 'completed' }
      )
    } else if (verificationStatus === 'rejected') {
      await Transaction.findOneAndUpdate(
        { relatedSale: sale._id },
        { status: 'failed' }
      )

      // Remove points from user
      await User.findByIdAndUpdate(sale.user, {
        $inc: { 'balance.points': -sale.pointsEarned }
      })
    }

    res.json({ msg: 'Продажа обновлена', sale })

  } catch (error) {
    console.error(error.message)
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Продажа не найдена' })
    }
    res.status(500).send('Ошибка сервера')
  }
})

// @route   DELETE /api/sales/:id
// @desc    Delete sale
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)

    if (!sale) {
      return res.status(404).json({ msg: 'Продажа не найдена' })
    }

    // Check if user owns this sale or is admin
    if (sale.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Доступ запрещен' })
    }

    // Only allow deletion if sale is pending
    if (sale.verificationStatus !== 'pending') {
      return res.status(400).json({ msg: 'Можно удалить только продажи в статусе "ожидает проверки"' })
    }

    await Sale.findByIdAndDelete(req.params.id)

    // Remove related transaction
    await Transaction.findOneAndDelete({ relatedSale: sale._id })

    // Remove points from user
    await User.findByIdAndUpdate(sale.user, {
      $inc: { 'balance.points': -sale.pointsEarned }
    })

    res.json({ msg: 'Продажа удалена' })

  } catch (error) {
    console.error(error.message)
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Продажа не найдена' })
    }
    res.status(500).send('Ошибка сервера')
  }
})

module.exports = router