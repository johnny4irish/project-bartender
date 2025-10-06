const express = require('express');
const router = express.Router();
const { getModel, checkConnection } = require('../models/ModelFactory')
const User = getModel('User')
const Sale = getModel('Sale')
const Prize = getModel('Prize')
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

// Get bartender role ObjectIds (supports both 'bartender' and 'test_bartender')
const getBartenderRoleIds = async () => {
  const Role = getModel('Role');
  const roles = await Role.find({ name: { $in: ['bartender', 'test_bartender'] } });
  return roles.map(r => r._id);
};

// @route   GET /api/stats
// @desc    Получить общую статистику для главной страницы
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Если MongoDB не подключена, быстро возвращаем безопасные значения,
    // чтобы избежать долгих таймаутов и зависаний фронтенда
    if (!checkConnection()) {
      // Фолбэк к локальным данным из /data
      try {
        const fs = require('fs')
        const path = require('path')
        const usersPath = path.join(__dirname, '..', 'data', 'users.json')
        const prizesPath = path.join(__dirname, '..', 'data', 'prizes.json')
        const usersRaw = fs.readFileSync(usersPath, 'utf8')
        const prizesRaw = fs.readFileSync(prizesPath, 'utf8')
        const users = JSON.parse(usersRaw)
        const prizes = JSON.parse(prizesRaw)
        const totalUsers = Array.isArray(users) ? users.length : 0
        const activeUsers = Array.isArray(users) ? users.filter(u => (u.points || 0) > 0).length : 0
        const totalPoints = Array.isArray(users) ? users.reduce((s, u) => s + (u.points || 0), 0) : 0
        const totalPrizes = Array.isArray(prizes) ? prizes.length : 0
        return res.json({ totalUsers, activeUsers, totalPoints, totalPrizes })
      } catch (e) {
        console.warn('Fallback stats load failed:', e.message)
        return res.json({ totalUsers: 0, activeUsers: 0, totalPoints: 0, totalPrizes: 0 })
      }
    }

    // Инициализируем значения по умолчанию
    let totalUsers = 0;
    let activeUsers = 0;
    let totalPoints = 0;
    let totalPrizes = 0;

    try {
      // Подсчет общего количества пользователей (всех пользователей)
      totalUsers = await User.countDocuments({});
    } catch (error) {
      console.error('Ошибка подсчета пользователей:', error.message);
    }
    
    try {
      // Подсчет активных пользователей (пользователи с баллами > 0)
      activeUsers = await User.countDocuments({ 
        points: { $gt: 0 } 
      });
    } catch (error) {
      console.error('Ошибка подсчета активных пользователей:', error.message);
    }
    
    try {
      // Подсчет общего количества баллов всех пользователей
      const totalPointsResult = await User.aggregate([
        { $group: { _id: null, total: { $sum: '$points' } } }
      ]);
      totalPoints = totalPointsResult.length > 0 ? totalPointsResult[0].total : 0;
    } catch (error) {
      console.error('Ошибка подсчета баллов:', error.message);
    }
    
    try {
      // Подсчет общего количества доступных призов
      totalPrizes = await Prize.countDocuments({ isActive: true });
    } catch (error) {
      console.error('Ошибка подсчета призов:', error.message);
    }

    const stats = {
      totalUsers,
      activeUsers,
      totalPoints,
      totalPrizes
    };

    res.json(stats);
  } catch (error) {
    console.error('Общая ошибка получения статистики:', error.message);
    res.status(200).json({ 
      totalUsers: 0,
      activeUsers: 0,
      totalPoints: 0,
      totalPrizes: 0
    });
  }
});

module.exports = router;

// Дополнительные роль‑зависимые эндпоинты статистики

// @route   GET /api/stats/me
// @desc    Личная статистика пользователя (бармен/любой авторизованный)
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    if (!checkConnection()) {
      return res.json({ totalSales: 0, totalAmount: 0, totalPoints: 0 });
    }
    const userId = req.user.id;
    const sales = await Sale.find({ user: userId });
    const stats = {
      totalSales: sales.length,
      totalAmount: sales.reduce((s, v) => s + (v.price || 0), 0),
      totalPoints: sales.reduce((s, v) => s + (v.pointsEarned || 0), 0),
    };
    res.json(stats);
  } catch (error) {
    console.error('Ошибка статистики /me:', error.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// @route   GET /api/stats/venue
// @desc    Статистика по заведению (бар) с разбивкой по барменам
// @access  Private (admin, bar_manager)
router.get('/venue', [auth, authorize(['admin', 'bar_manager', 'bar'])], async (req, res) => {
  try {
    if (!checkConnection()) {
      return res.json({ totalSales: 0, totalAmount: 0, totalPoints: 0, byBartender: [] });
    }
    const barId = req.user.bar;
    const sales = await Sale.find({ bar: barId });

    const totalSales = sales.length;
    const totalAmount = sales.reduce((s, v) => s + (v.price || 0), 0);
    const totalPoints = sales.reduce((s, v) => s + (v.pointsEarned || 0), 0);

    const byBartenderMap = new Map();
    for (const sale of sales) {
      const uid = (sale.user && sale.user.toString) ? sale.user.toString() : String(sale.user);
      const current = byBartenderMap.get(uid) || { user: uid, totalSales: 0, totalAmount: 0, totalPoints: 0 };
      current.totalSales += 1;
      current.totalAmount += (sale.price || 0);
      current.totalPoints += (sale.pointsEarned || 0);
      byBartenderMap.set(uid, current);
    }
    const byBartender = Array.from(byBartenderMap.values());

    res.json({ totalSales, totalAmount, totalPoints, byBartender });
  } catch (error) {
    console.error('Ошибка статистики /venue:', error.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// @route   GET /api/stats/brand
// @desc    Статистика по бренду (производитель/дистрибьютор)
// @access  Private (admin, brand_representative)
router.get('/brand', [auth, authorize(['admin', 'brand_representative'])], async (req, res) => {
  try {
    if (!checkConnection()) {
      return res.json({ totalSales: 0, totalAmount: 0, totalPoints: 0 });
    }
    const brand = (req.query.brand || '').trim();
    if (!brand) {
      return res.status(400).json({ msg: 'Параметр brand обязателен' });
    }
    const sales = await Sale.find({ brand });
    const stats = {
      totalSales: sales.length,
      totalAmount: sales.reduce((s, v) => s + (v.price || 0), 0),
      totalPoints: sales.reduce((s, v) => s + (v.pointsEarned || 0), 0),
    };
    res.json(stats);
  } catch (error) {
    console.error('Ошибка статистики /brand:', error.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});