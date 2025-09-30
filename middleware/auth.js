const jwt = require('jsonwebtoken');
const { getModel } = require('../models/ModelFactory')
const User = getModel('User')

module.exports = async (req, res, next) => {
  // Получаем токен из заголовка Authorization или x-auth-token
  let token = req.header('x-auth-token');
  
  // Если токен не найден в x-auth-token, проверяем Authorization header
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Убираем "Bearer " префикс
    }
  }
  
  console.log('Auth Middleware: Получен запрос на', req.path);
  console.log('Auth Middleware: Токен из заголовка:', token ? `${token.substring(0, 20)}...` : 'отсутствует');

  // Проверяем наличие токена
  if (!token) {
    console.log('Auth Middleware: Токен отсутствует, возвращаем 401');
    return res.status(401).json({ msg: 'Нет токена, доступ запрещен' });
  }

  try {
    // Верифицируем токен
    console.log('Auth Middleware: Верифицируем токен с JWT_SECRET');
    console.log('Auth Middleware: JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('Auth Middleware: JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth Middleware: Токен декодирован:', decoded);
    console.log('Auth Middleware: ID пользователя из токена:', decoded.userId);
    
    // Находим пользователя
    console.log('Auth Middleware: Ищем пользователя по ID:', decoded.userId);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('Auth Middleware: Пользователь не найден в базе данных');
      return res.status(401).json({ msg: 'Пользователь не найден' });
    }

    // Получаем роль пользователя из базы данных, если это ObjectId
    let userRole = user.role;
    console.log('Auth Middleware: Исходная роль:', userRole, 'Тип:', typeof userRole);
    
    if (typeof userRole === 'string' && userRole.length === 24) {
      try {
        const Role = require('../models/Role');
        const roleDoc = await Role.findById(userRole);
        userRole = roleDoc ? roleDoc.name : userRole;
        console.log('Auth Middleware: Роль из базы данных (строка):', userRole);
      } catch (roleError) {
        console.log('Auth Middleware: Ошибка получения роли:', roleError.message);
      }
    } else if (userRole && typeof userRole === 'object') {
      // Если роль - это ObjectId объект
      try {
        const Role = require('../models/Role');
        const roleId = userRole._id || userRole.toString();
        console.log('Auth Middleware: Ищем роль по ID:', roleId);
        const roleDoc = await Role.findById(roleId);
        userRole = roleDoc ? roleDoc.name : userRole;
        console.log('Auth Middleware: Роль из объекта:', userRole);
      } catch (roleError) {
        console.log('Auth Middleware: Ошибка получения роли из объекта:', roleError.message);
      }
    }

    // Удаляем пароль из объекта пользователя перед передачей
    const userWithoutPassword = { 
      id: user._id,  // Используем _id из InMemoryUser
      _id: user._id, // Добавляем также _id для совместимости
      name: user.name,
      email: user.email,
      phone: user.phone,
      bar: user.bar,
      city: user.city,
      role: userRole, // Используем преобразованную роль
      points: user.points,
      totalEarnings: user.totalEarnings,
      availableBalance: user.availableBalance,
      withdrawnAmount: user.withdrawnAmount,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    console.log('Auth Middleware: Пользователь найден:', user.email);
    console.log('Auth Middleware: Устанавливаем req.user с ID:', userWithoutPassword.id);
    console.log('Auth Middleware: Роль пользователя:', userWithoutPassword.role);
    req.user = userWithoutPassword;
    next();
  } catch (error) {
    console.log('Auth Middleware: Ошибка верификации токена:', error.message);
    console.log('Auth Middleware: Полная ошибка:', error);
    res.status(401).json({ msg: 'Токен недействителен' });
  }
};