const express = require('express');
const router = express.Router();
const { getModel } = require('../models/ModelFactory')
const User = getModel('User')
const Sale = getModel('Sale')
const Prize = getModel('Prize')

// Get the bartender role ObjectId
const getBartenderRoleId = async () => {
  const Role = getModel('Role');
  const bartenderRole = await Role.findOne({ name: 'test_bartender' });
  return bartenderRole ? bartenderRole._id : null;
};

// @route   GET /api/stats
// @desc    Получить общую статистику для главной страницы
// @access  Public
router.get('/', async (req, res) => {
  try {
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