const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const router = express.Router()
const auth = require('../middleware/auth')
const { getModel } = require('../models/ModelFactory')
const User = getModel('User')
const Sale = getModel('Sale')
const Prize = getModel('Prize')
const Transaction = getModel('Transaction')
const Product = getModel('Product')
const Category = require('../models/Category')
const Brand = require('../models/Brand')
const City = require('../models/City')
const Bar = require('../models/Bar')
const Role = require('../models/Role')

// Настройка хранения изображений призов (расположено до объявлений роутов)
const uploadDir = path.join(process.cwd(), 'uploads', 'prizes')
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }
} catch (e) {
  console.error('Failed to ensure upload directory:', e)
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase()
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '')
    cb(null, `${base}-${Date.now()}${ext}`)
  }
})

const imageFilter = function (req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(new Error('Неподдерживаемый формат изображения'))
}

const prizeUpload = multer({ storage, fileFilter: imageFilter })

// Get bartender role ObjectIds (supports both 'bartender' and 'test_bartender')
const getBartenderRoleIds = async () => {
  const roles = await Role.find({ name: { $in: ['bartender', 'test_bartender'] } });
  return roles.map(r => r._id);
};

// Импортируем утилиты для работы с ролями
const { hasAdminAccessAsync, hasModerationAccessAsync } = require('../utils/roleUtils');

// Middleware для проверки прав администратора
const adminAuth = async (req, res, next) => {
  try {
    console.log('AdminAuth: Проверяем доступ пользователя:', req.user.email);
    console.log('AdminAuth: Роль пользователя:', req.user.role);
    
    const hasAccess = await hasAdminAccessAsync(req.user);
    
    if (!hasAccess) {
      console.log('AdminAuth: Доступ запрещен для пользователя:', req.user.email);
      return res.status(403).json({ msg: 'Доступ запрещен' });
    }
    
    console.log('AdminAuth: Доступ разрешен для пользователя:', req.user.email);
    next();
  } catch (error) {
    console.error('AdminAuth error:', error.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// Middleware для проверки прав модерации продаж (админ/бренд/менеджер бара)
const moderationAuth = async (req, res, next) => {
  try {
    console.log('ModerationAuth: Проверяем доступ пользователя:', req.user.email);
    console.log('ModerationAuth: Роль пользователя:', req.user.role);

    const hasAccess = await hasModerationAccessAsync(req.user);

    if (!hasAccess) {
      console.log('ModerationAuth: Доступ запрещен для пользователя:', req.user.email);
      return res.status(403).json({ msg: 'Доступ запрещен' });
    }

    console.log('ModerationAuth: Доступ разрешен для пользователя:', req.user.email);
    next();
  } catch (error) {
    console.error('ModerationAuth error:', error.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// @route   GET /api/admin/dashboard
// @desc    Получить статистику для админ-панели
// @access  Private (Admin/Brand Rep)
router.get('/dashboard', [auth, adminAuth], async (req, res) => {
  try {
    // Get bartender role ObjectIds
    const bartenderRoleIds = await getBartenderRoleIds();
    
    // Общее количество пользователей (всех ролей)
    const totalUsers = await User.countDocuments()
    
    // Количество барменов
    const totalBartenders = bartenderRoleIds.length ? await User.countDocuments({ role: { $in: bartenderRoleIds } }) : 0
    
    // Статистика продаж
    const totalSales = await Sale.countDocuments()
    const pendingSales = await Sale.countDocuments({ verificationStatus: 'pending' })
    
    // Общие баллы барменов
    const totalPoints = bartenderRoleIds.length ? await User.aggregate([
      { $match: { role: { $in: bartenderRoleIds } } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]) : []

    // Общий доход от продаж
    const totalRevenue = await Sale.aggregate([
      { $match: { verificationStatus: 'approved' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ])

    const recentSales = await Sale.find()
      .populate('user', 'name email bar city')
      .sort({ createdAt: -1 })
      .limit(10)

    // Топ барменов с агрегацией продаж (для in-memory базы)
    const bartenders = bartenderRoleIds.length ? await User.find({ role: { $in: bartenderRoleIds } }).limit(10) : []
    const { collections } = require('../config/db')
    const allSales = Array.from(collections.sales.values())
    
    const topBartenders = bartenders.map(bartender => {
      // Находим все продажи этого бармена
      const bartenderSales = allSales.filter(sale => 
        sale.user && sale.user.toString() === bartender._id.toString()
      )
      
      // Считаем статистику
      const totalSales = bartenderSales.length
      const totalAmount = bartenderSales.reduce((sum, sale) => sum + (sale.price || 0), 0)
      
      return {
        _id: bartender._id,
        name: bartender.name,
        email: bartender.email,
        bar: bartender.bar,
        city: bartender.city,
        points: bartender.points,
        totalEarnings: bartender.totalEarnings,
        totalSales,
        totalAmount
      }
    }).sort((a, b) => b.points - a.points)

    const salesByMonth = await Sale.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$price' },
          totalPoints: { $sum: '$pointsEarned' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ])

    const brandStats = await Sale.aggregate([
      { $match: { verificationStatus: 'approved' } },
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 },
          totalAmount: { $sum: '$price' },
          totalPoints: { $sum: '$pointsEarned' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])

    // Статистика по ролям пользователей
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ])

    // Возвращаем данные в формате, который ожидает frontend
    res.json({
      totalUsers,
      totalBartenders,
      totalSales,
      pendingSales,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalPoints: totalPoints[0]?.total || 0,
      recentSales,
      topBartenders,
      salesByMonth,
      brandStats,
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {})
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   GET /api/admin/sales
// @desc    Получить все продажи для модерации
// @access  Private (Admin/Brand Rep)
router.get('/sales', [auth, moderationAuth], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const status = req.query.status
    const brand = req.query.brand
    const startIndex = (page - 1) * limit

    let query = {}
    if (status) query.verificationStatus = status
    if (brand) query.brand = new RegExp(brand, 'i')

    // Менеджер бара видит только продажи своего бара
    const { getRoleNameAsync } = require('../utils/roleUtils');
    const roleName = await getRoleNameAsync(req.user.role);
    if (roleName === 'bar_manager' && req.user.bar) {
      query.bar = req.user.bar
    }

    const total = await Sale.countDocuments(query)
    const sales = await Sale.find(query)
      .populate('user', 'name email bar city phone')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex)
      .lean()

    res.json({
      sales,
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

// @route   PUT /api/admin/sales/:id/verify
// @desc    Верифицировать продажу
// @access  Private (Admin/Brand Rep)
router.put('/sales/:id/verify', [auth, moderationAuth], async (req, res) => {
  try {
    const { status, notes } = req.body

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: 'Неверный статус' })
    }

    console.log('Ищем продажу с ID:', req.params.id)
    const sale = await Sale.findById(req.params.id)
    if (!sale) {
      console.log('Продажа не найдена')
      return res.status(404).json({ msg: 'Продажа не найдена' })
    }
    
    // Вызываем populate отдельно
    await sale.populate('user')

    // Менеджер бара может модерировать только продажи своего бара
    const { getRoleNameAsync } = require('../utils/roleUtils');
    const roleName = await getRoleNameAsync(req.user.role);
    if (roleName === 'bar_manager' && req.user.bar && sale.bar !== req.user.bar) {
      return res.status(403).json({ msg: 'Доступ запрещен: можно модерировать только продажи своего бара' })
    }

    console.log('Продажа найдена:', sale._id, 'Пользователь:', sale.user ? sale.user._id : 'не загружен')

    const oldStatus = sale.verificationStatus
    sale.verificationStatus = status
    sale.verificationNotes = notes
    sale.verifiedBy = req.user.id
    sale.verifiedAt = new Date()

    // Если продажа была отклонена после одобрения, вычесть баллы
    if (oldStatus === 'approved' && status === 'rejected') {
      console.log('Вычитаем баллы пользователя')
      sale.user.points = Math.max(0, sale.user.points - sale.pointsEarned)
      sale.user.totalEarnings = Math.max(0, sale.user.totalEarnings - sale.pointsEarned)
      await sale.user.save()

      // Создать транзакцию возврата
      const transaction = new Transaction({
        user: sale.user._id,
        transactionId: `deduction_${Date.now()}_${sale.user._id}`,
        type: 'deduction',
        amount: sale.pointsEarned,
        netAmount: sale.pointsEarned,
        status: 'completed',
        method: 'points',
        description: `Возврат баллов за отклоненную продажу: ${sale.product}`,
        relatedSale: sale._id
      })
      await transaction.save()
    }

    // Если продажа была одобрена после отклонения, добавить баллы
    if (oldStatus === 'rejected' && status === 'approved') {
      console.log('Добавляем баллы пользователя')
      sale.user.points += sale.pointsEarned
      sale.user.totalEarnings += sale.pointsEarned
      await sale.user.save()

      // Создать транзакцию начисления
      const transaction = new Transaction({
        user: sale.user._id,
        transactionId: `earning_${Date.now()}_${sale.user._id}`,
        type: 'earning',
        amount: sale.pointsEarned,
        netAmount: sale.pointsEarned,
        status: 'completed',
        method: 'points',
        description: `Баллы за продажу: ${sale.product}`,
        relatedSale: sale._id
      })
      await transaction.save()
    }

    console.log('Сохраняем продажу')
    // Сохраняем только ID пользователя, а не полный объект
    const userId = sale.user._id
    sale.user = userId
    await sale.save()

    console.log('Продажа успешно обновлена')
    res.json({ msg: 'Продажа обновлена', sale })
  } catch (error) {
    console.error('Ошибка при одобрении продажи:', error.message)
    console.error('Stack trace:', error.stack)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   GET /api/admin/users
// @desc    Получить всех пользователей
// @access  Private (Admin/Brand Rep)
router.get('/users', [auth, adminAuth], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const role = req.query.role
    const search = req.query.search
    const startIndex = (page - 1) * limit

    let query = {}
    if (role) query.role = role
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { bar: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') }
      ]
    }

    const total = await User.countDocuments(query)
    const usersResult = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex)

    // Извлекаем массив пользователей из результата
    const users = usersResult.users || usersResult

    res.json({
      users,
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

// @route   POST /api/admin/users/reset-password
// @desc    Сбросить пароль пользователя по email
// @access  Private (Admin)
router.post('/users/reset-password', [auth, adminAuth], async (req, res) => {
  try {
    const { email, newPassword } = req.body

    console.log('Admin: запрос на сброс пароля', { email, hasNewPassword: !!newPassword })

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ msg: 'Требуется корректный email' })
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ msg: 'Пароль обязателен и должен быть не менее 6 символов' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      console.log('Admin: пользователь для сброса пароля не найден', email)
      return res.status(404).json({ msg: 'Пользователь не найден' })
    }

    // Assign plaintext and rely on User pre-save hook to hash once
    user.password = newPassword
    user.updatedAt = new Date()
    await user.save()

    console.log('Admin: пароль пользователя сброшен', { userId: user._id, email: user.email })
    res.json({ msg: 'Пароль успешно обновлён', user: { id: user._id, email: user.email } })
  } catch (error) {
    console.error('Admin: ошибка при сбросе пароля', error.message)
    res.status(500).json({ msg: 'Ошибка сервера' })
  }
})

// @route   PUT /api/admin/users/:id/status
// @desc    Изменить статус пользователя
// @access  Private (Admin/Brand Rep)
router.put('/users/:id/status', [auth, adminAuth], async (req, res) => {
  try {
    const { isActive } = req.body

    const user = await User.findById(req.params.id).select('-password')
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' })
    }

    user.isActive = isActive
    await user.save()

    res.json({ msg: 'Статус пользователя обновлен', user })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   DELETE /api/admin/users/:id
// @desc    Удалить пользователя
// @access  Private (Admin/Brand Rep)
router.delete('/users/:id', [auth, adminAuth], async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' })
    }

    // Запретить удаление администраторов
    if (user.role === 'admin') {
      return res.status(400).json({ msg: 'Нельзя удалить администратора' })
    }

    // Удаляем пользователя из in-memory базы
    const { collections } = require('../config/db')
    collections.users.delete(req.params.id)

    res.json({ msg: 'Пользователь удален' })
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error.message)
    res.status(500).json({ msg: 'Ошибка удаления пользователя' })
  }
})

// @route   GET /api/admin/prizes
// @desc    Получить все призы
// @access  Private (Admin/Brand Rep)
router.get('/prizes', [auth, adminAuth], async (req, res) => {
  try {
    const prizes = await Prize.find()
    // Сортируем на стороне JavaScript для файлового хранилища
    const sortedPrizes = prizes.sort((a, b) => a.cost - b.cost)
    res.json(sortedPrizes)
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   POST /api/admin/prizes
// @desc    Создать новый приз
// @access  Private (Admin/Brand Rep)
router.post('/prizes', [auth, adminAuth, prizeUpload.single('image')], async (req, res) => {
  try {
    const { name, description, pointsCost, category, imageUrl, isActive, quantity } = req.body

    const finalImageUrl = req.file ? `/uploads/prizes/${req.file.filename}` : imageUrl

    const prizeData = {
      name,
      description,
      cost: pointsCost,
      category,
      imageUrl: finalImageUrl,
      isActive,
      quantity,
      originalQuantity: quantity,
      createdBy: req.user.id
    }

    const prize = await Prize.create(prizeData)
    res.json(prize)
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   PUT /api/admin/prizes/:id
// @desc    Обновить приз
// @access  Private (Admin/Brand Rep)
router.put('/prizes/:id', [auth, adminAuth, prizeUpload.single('image')], async (req, res) => {
  try {
    const { name, description, pointsCost, category, imageUrl, isActive, quantity } = req.body

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (pointsCost !== undefined) updateData.cost = pointsCost
    if (category !== undefined) updateData.category = category
    // Если пришел файл, приоритизируем его над imageUrl
    if (req.file) {
      updateData.imageUrl = `/uploads/prizes/${req.file.filename}`
    } else if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl
    }
    if (isActive !== undefined) updateData.isActive = isActive
    if (quantity !== undefined) updateData.quantity = quantity

    const prize = await Prize.findByIdAndUpdate(req.params.id, updateData, { new: true })
    
    if (!prize) {
      return res.status(404).json({ msg: 'Приз не найден' })
    }

    res.json(prize)
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   DELETE /api/admin/prizes/:id
// @desc    Удалить приз
// @access  Private (Admin/Brand Rep)
router.delete('/prizes/:id', [auth, adminAuth], async (req, res) => {
  try {
    const prize = await Prize.findByIdAndDelete(req.params.id)
    if (!prize) {
      return res.status(404).json({ msg: 'Приз не найден' })
    }

    res.json({ msg: 'Приз удален' })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   GET /api/admin/transactions
// @desc    Получить все транзакции
// @access  Private (Admin/Brand Rep)
router.get('/transactions', [auth, adminAuth], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const type = req.query.type
    const startIndex = (page - 1) * limit

    let query = {}
    if (type) query.type = type

    const total = await Transaction.countDocuments(query)
    const transactions = await Transaction.find(query)
      .populate('user', 'name email bar city')
      .populate('relatedSale', 'product brand price')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex)
      .lean()

    res.json({
      transactions,
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

// @route   GET /api/admin/products
// @desc    Получить все продукты
// @route   GET /api/admin/products
// @desc    Получить список продуктов
// @access  Private (Admin/Brand Rep)
router.get('/products', [auth, adminAuth], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const category = req.query.category
    const search = req.query.search
    const startIndex = (page - 1) * limit

    // Получаем все продукты (lean для ускорения)
    let allProducts = await Product.find().lean()
    
    // Фильтрация по категории
    if (category) {
      allProducts = allProducts.filter(product => String(product.category) === category)
    }
    
    // Поиск по названию или бренду
    if (search) {
      const searchLower = search.toLowerCase()
      allProducts = allProducts.filter(product => 
        (product.name || '').toLowerCase().includes(searchLower) ||
        String(product.brand || '').toLowerCase().includes(searchLower)
      )
    }
    
    // Сортировка по дате создания (новые первыми)
    allProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    const total = allProducts.length
    const products = allProducts.slice(startIndex, startIndex + limit)

    res.json({
      products,
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

// @route   POST /api/admin/products
// @desc    Создать новый продукт
// @access  Private (Admin/Brand Rep)
router.post('/products', [auth, adminAuth], async (req, res) => {
  console.log('=== POST /api/admin/products START ===')
  console.log('Request body:', JSON.stringify(req.body, null, 2))
  
  try {
    const { 
      name, 
      brand, 
      category, 
      pointsPerRuble, 
      pointsCalculationType,
      pointsPerPortion,
      portionSizeGrams,
      wholesalePrice,
      packageVolume,
      alcoholContent,
      description,
      isActive,
      bottlePrice,
      portionsPerBottle
    } = req.body

    console.log('Extracted fields:')
    console.log('- name:', name)
    console.log('- brand:', brand)
    console.log('- category:', category)
    console.log('- bottlePrice:', bottlePrice)
    console.log('- portionsPerBottle:', portionsPerBottle)

    // Обрабатываем бренд - находим существующий или создаем новый
    console.log('Processing brand:', brand)
    let brandId;
    
    if (mongoose.Types.ObjectId.isValid(brand)) {
      // Если передан ObjectId, используем его
      brandId = brand;
      console.log('Brand is ObjectId:', brandId)
    } else {
      // Если передана строка, ищем бренд по имени или создаем новый
      console.log('Brand is string, searching for existing brand...')
      let existingBrand = await Brand.findOne({ name: brand });
      
      if (existingBrand) {
        brandId = existingBrand._id;
        console.log('Found existing brand:', brandId)
      } else {
        // Создаем новый бренд
        console.log('Creating new brand:', brand)
        const newBrand = new Brand({
          name: brand,
          displayName: brand,
          isActive: true
        });
        await newBrand.save();
        brandId = newBrand._id;
        console.log('Created new brand:', brandId)
      }
    }

    // Обрабатываем категорию - находим существующую или создаем новую
    console.log('Processing category:', category)
    let categoryId;
    
    if (mongoose.Types.ObjectId.isValid(category)) {
      // Если передан ObjectId, используем его
      categoryId = category;
      console.log('Category is ObjectId:', categoryId)
    } else {
      // Если передана строка, ищем категорию по имени или создаем новую
      console.log('Category is string, searching for existing category...')
      let existingCategory = await Category.findOne({ name: category });
      
      if (existingCategory) {
        categoryId = existingCategory._id;
        console.log('Found existing category:', categoryId)
      } else {
        // Создаем новую категорию
        console.log('Creating new category:', category)
        const newCategory = new Category({
          name: category,
          displayName: category,
          isActive: true
        });
        await newCategory.save();
        categoryId = newCategory._id;
        console.log('Created new category:', categoryId)
      }
    }

    // Проверяем, не существует ли уже такой продукт
    console.log('Checking for existing product...')
    const existingProduct = await Product.findOne({ name, brand: brandId })
    if (existingProduct) {
      console.log('Product already exists:', existingProduct._id)
      return res.status(400).json({ msg: 'Продукт с таким названием и брендом уже существует' })
    }
    console.log('No existing product found, proceeding with creation...')

    const productData = {
      name,
      brand: brandId,
      category: categoryId,
      pointsPerRuble: pointsPerRuble || (10/150),
      pointsCalculationType: pointsCalculationType || 'per_ruble',
      pointsPerPortion: pointsPerPortion || 0,
      portionSizeGrams: portionSizeGrams || 0,
      wholesalePrice: wholesalePrice || 0,
      packageVolume: packageVolume || 0,
      alcoholContent: alcoholContent || 0,
      description,
      isActive: isActive !== undefined ? isActive : true,
      bottlePrice: (bottlePrice !== undefined && bottlePrice !== null && bottlePrice !== '') ? Number(bottlePrice) : 0,
      portionsPerBottle: (portionsPerBottle !== undefined && portionsPerBottle !== null && portionsPerBottle !== '') ? Number(portionsPerBottle) : 12
    }

    console.log('Product data to save:', JSON.stringify(productData, null, 2))

    const product = new Product(productData)
    console.log('Product instance created, attempting to save...')
    
    await product.save()
    console.log('Product saved successfully:', product._id)
    
    res.json({ msg: 'Продукт создан', product })
    console.log('=== POST /api/admin/products SUCCESS ===')
  } catch (error) {
    console.error('=== POST /api/admin/products ERROR ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    if (error.errors) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2))
    }
    console.error('=== END ERROR ===')
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// @route   PUT /api/admin/products/:id
// @desc    Обновить продукт
// @access  Private (Admin/Brand Rep)
router.put('/products/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { 
      name, 
      brand, 
      category, 
      pointsPerRuble, 
      pointsCalculationType,
      pointsPerPortion,
      portionSizeGrams,
      wholesalePrice,
      packageVolume,
      alcoholContent,
      description, 
      isActive,
      bottlePrice,
      portionsPerBottle
    } = req.body

    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ msg: 'Продукт не найден' })
    }

    // Обновляем поля
    if (name !== undefined) product.name = name
    if (brand !== undefined) product.brand = brand
    if (category !== undefined) product.category = category
    if (pointsPerRuble !== undefined) product.pointsPerRuble = pointsPerRuble
    if (pointsCalculationType !== undefined) product.pointsCalculationType = pointsCalculationType
    if (pointsPerPortion !== undefined) product.pointsPerPortion = pointsPerPortion
    if (portionSizeGrams !== undefined) product.portionSizeGrams = portionSizeGrams
    if (wholesalePrice !== undefined) product.wholesalePrice = wholesalePrice
    if (packageVolume !== undefined) product.packageVolume = packageVolume
    if (alcoholContent !== undefined) product.alcoholContent = alcoholContent
    if (description !== undefined) product.description = description
    if (isActive !== undefined) product.isActive = isActive
    if (bottlePrice !== undefined) product.bottlePrice = bottlePrice
    if (portionsPerBottle !== undefined) product.portionsPerBottle = portionsPerBottle

    await product.save()
    res.json({ msg: 'Продукт обновлен', product })
  } catch (error) {
    console.error(error.message)
    res.status(500).send('Ошибка сервера')
  }
})

// @route   DELETE /api/admin/products/:id
// @desc    Удалить продукт
// @access  Private (Admin/Brand Rep)
router.delete('/products/:id', [auth, adminAuth], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ msg: 'Продукт не найден' })
    }

    await product.remove()
    res.json({ msg: 'Продукт удален' })
  } catch (error) {
    console.error(error.message)
    res.status(500).send('Ошибка сервера')
  }
})

// ===== СПРАВОЧНИКИ =====

// @route   GET /api/admin/categories
// @desc    Получить все категории
// @access  Private (Admin/Brand Rep)
router.get('/categories', [auth, adminAuth], async (req, res) => {
  try {
    const categories = await Category.getActive();
    res.json(categories);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Ошибка сервера');
  }
});

// @route   POST /api/admin/categories
// @desc    Создать новую категорию
// @access  Private (Admin)
router.post('/categories', [auth, adminAuth], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Доступ запрещен' });
    }

    const { name, displayName, description, icon, color, sortOrder } = req.body;
    
    const category = new Category({
      name,
      displayName,
      description,
      icon,
      color,
      sortOrder
    });

    await category.save();
    res.json(category);
  } catch (error) {
    console.error(error.message);
    if (error.code === 11000) {
      return res.status(400).json({ msg: 'Категория с таким именем уже существует' });
    }
    res.status(500).send('Ошибка сервера');
  }
});

// @route   PUT /api/admin/categories/:id
// @desc    Обновить категорию
// @access  Private (Admin)
router.put('/categories/:id', [auth, adminAuth], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Доступ запрещен' });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ msg: 'Категория не найдена' });
    }

    const { name, displayName, description, icon, color, sortOrder, isActive } = req.body;
    
    if (name) category.name = name;
    if (displayName) category.displayName = displayName;
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (color) category.color = color;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    res.json(category);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Ошибка сервера');
  }
});

// @route   DELETE /api/admin/categories/:id
// @desc    Удалить категорию
// @access  Private (Admin)
router.delete('/categories/:id', [auth, adminAuth], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Доступ запрещен' });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ msg: 'Категория не найдена' });
    }

    await category.deactivate();
    res.json({ msg: 'Категория деактивирована' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Ошибка сервера');
  }
});

// @route   GET /api/admin/brands
// @desc    Получить все бренды
// @access  Private (Admin/Brand Rep)
router.get('/brands', [auth, adminAuth], async (req, res) => {
  try {
    const brands = await Brand.getActive();
    res.json(brands);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Ошибка сервера');
  }
});

// @route   POST /api/admin/brands
// @desc    Создать новый бренд
// @access  Private (Admin)
router.post('/brands', [auth, adminAuth], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Доступ запрещен' });
    }

    const { name, displayName, description, logo, website, contactInfo, country, foundedYear, tags, socialMedia } = req.body;
    
    const brand = new Brand({
      name,
      displayName,
      description,
      logo,
      website,
      contactInfo,
      country,
      foundedYear,
      tags,
      socialMedia
    });

    await brand.save();
    res.json(brand);
  } catch (error) {
    console.error(error.message);
    if (error.code === 11000) {
      return res.status(400).json({ msg: 'Бренд с таким именем уже существует' });
    }
    res.status(500).send('Ошибка сервера');
  }
});

// @route   PUT /api/admin/brands/:id
// @desc    Обновить бренд
// @access  Private (Admin/Brand Rep)
router.put('/brands/:id', [auth, adminAuth], async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ msg: 'Бренд не найден' });
    }

    // Представители бренда могут редактировать только свой бренд
    if (req.user.role === 'brand_representative' && req.user.brand && req.user.brand.toString() !== req.params.id) {
      return res.status(403).json({ msg: 'Доступ запрещен' });
    }

    const { name, displayName, description, logo, website, contactInfo, country, foundedYear, tags, socialMedia, isActive } = req.body;
    
    if (name && req.user.role === 'admin') brand.name = name;
    if (displayName) brand.displayName = displayName;
    if (description !== undefined) brand.description = description;
    if (logo !== undefined) brand.logo = logo;
    if (website !== undefined) brand.website = website;
    if (contactInfo !== undefined) brand.contactInfo = contactInfo;
    if (country) brand.country = country;
    if (foundedYear !== undefined) brand.foundedYear = foundedYear;
    if (tags) brand.tags = tags;
    if (socialMedia !== undefined) brand.socialMedia = socialMedia;
    if (isActive !== undefined && req.user.role === 'admin') brand.isActive = isActive;

    await brand.save();
    res.json(brand);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Ошибка сервера');
  }
});

// @route   GET /api/admin/cities
// @desc    Получить все города
// @access  Private (Admin/Brand Rep)
router.get('/cities', [auth, adminAuth], async (req, res) => {
  try {
    const cities = await City.getActive();
    res.json(cities);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Ошибка сервера');
  }
});

// @route   POST /api/admin/cities
// @desc    Создать новый город
// @access  Private (Admin)
router.post('/cities', [auth, adminAuth], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Доступ запрещен' });
    }

    const { name, region, country, timezone, coordinates, population, isCapital, postalCodes, phoneCode } = req.body;
    
    const city = new City({
      name,
      region,
      country,
      timezone,
      coordinates,
      population,
      isCapital,
      postalCodes,
      phoneCode
    });

    await city.save();
    res.json(city);
  } catch (error) {
    console.error(error.message);
    if (error.code === 11000) {
      return res.status(400).json({ msg: 'Город с таким именем уже существует в данной стране' });
    }
    res.status(500).send('Ошибка сервера');
  }
});

// @route   GET /api/admin/bars
// @desc    Получить все бары
// @access  Private (Admin/Brand Rep)
router.get('/bars', [auth, adminAuth], async (req, res) => {
  try {
    const bars = await Bar.getActive().populate('city manager');
    res.json(bars);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Ошибка сервера');
  }
});

// @route   POST /api/admin/bars
// @desc    Создать новый бар
// @access  Private (Admin)
router.post('/bars', [auth, adminAuth], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Доступ запрещен' });
    }

    const { name, address, city, coordinates, contactInfo, manager, workingHours, capacity, features, socialMedia, images, tags } = req.body;
    
    const bar = new Bar({
      name,
      address,
      city,
      coordinates,
      contactInfo,
      manager,
      workingHours,
      capacity,
      features,
      socialMedia,
      images,
      tags
    });

    await bar.save();
    await bar.populate('city manager');
    res.json(bar);
  } catch (error) {
    console.error(error.message);
    if (error.code === 11000) {
      return res.status(400).json({ msg: 'Бар с таким именем уже существует в данном городе' });
    }
    res.status(500).send('Ошибка сервера');
  }
});

// @route   GET /api/admin/roles
// @desc    Получить все роли
// @access  Private (Admin)
router.get('/roles', [auth, adminAuth], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Доступ запрещен' });
    }

    const roles = await Role.getActive();
    res.json(roles);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Ошибка сервера');
  }
});

// @route   POST /api/admin/roles
// @desc    Создать новую роль
// @access  Private (Admin)
router.post('/roles', [auth, adminAuth], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Доступ запрещен' });
    }

    const { name, displayName, description, permissions, level, color, icon } = req.body;
    
    const role = new Role({
      name,
      displayName,
      description,
      permissions,
      level,
      color,
      icon
    });

    await role.save();
    res.json(role);
  } catch (error) {
    console.error(error.message);
    if (error.code === 11000) {
      return res.status(400).json({ msg: 'Роль с таким именем уже существует' });
    }
    res.status(500).send('Ошибка сервера');
  }
});

module.exports = router