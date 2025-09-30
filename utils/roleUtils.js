/**
 * Утилиты для работы с ролями пользователей
 * Централизованная логика проверки ролей для всего приложения
 */

/**
 * Получает название роли из различных форматов
 * @param {string|Object} role - Роль пользователя (строка, ObjectId или объект роли)
 * @returns {string|null} - Название роли или null
 */
function getRoleName(role) {
  if (!role) return null;
  
  // Если роль уже строка
  if (typeof role === 'string') {
    // Проверяем, не является ли это ObjectId (24 символа)
    if (role.length === 24) {
      // Это ObjectId в виде строки, нужно получить роль из базы
      return null; // Вернем null, чтобы вызывающий код мог обработать это
    }
    return role;
  }
  
  // Если роль - объект с полем name
  if (role && typeof role === 'object' && role.name) {
    return role.name;
  }
  
  return null;
}

/**
 * Проверяет, является ли пользователь администратором
 * @param {Object} user - Объект пользователя
 * @returns {boolean} - true если пользователь администратор
 */
function isAdmin(user) {
  if (!user || !user.role) return false;
  
  const roleName = getRoleName(user.role);
  return roleName === 'admin';
}

/**
 * Проверяет, является ли пользователь представителем бренда
 * @param {Object} user - Объект пользователя
 * @returns {boolean} - true если пользователь представитель бренда
 */
function isBrandRepresentative(user) {
  if (!user || !user.role) return false;
  
  const roleName = getRoleName(user.role);
  return roleName === 'brand_representative';
}

/**
 * Проверяет, имеет ли пользователь доступ к админ-панели
 * @param {Object} user - Объект пользователя
 * @returns {boolean} - true если пользователь имеет доступ к админ-панели
 */
function hasAdminAccess(user) {
  return isAdmin(user) || isBrandRepresentative(user);
}

/**
 * Проверяет, является ли пользователь барменом
 * @param {Object} user - Объект пользователя
 * @returns {boolean} - true если пользователь бармен
 */
function isBartender(user) {
  if (!user || !user.role) return false;
  
  const roleName = getRoleName(user.role);
  return roleName === 'bartender' || roleName === 'test_bartender';
}

/**
 * Получает отображаемое название роли на русском языке
 * @param {string|Object} role - Роль пользователя
 * @returns {string} - Отображаемое название роли
 */
function getRoleDisplayName(role) {
  const roleName = getRoleName(role);
  
  switch (roleName) {
    case 'admin':
      return 'Администратор';
    case 'brand_representative':
      return 'Представитель бренда';
    case 'bartender':
    case 'test_bartender':
      return 'Бармен';
    default:
      return roleName || 'Неизвестная роль';
  }
}

/**
 * Асинхронная функция для получения названия роли из ObjectId
 * @param {string|Object} role - Роль пользователя (может быть ObjectId)
 * @returns {Promise<string|null>} - Название роли или null
 */
async function getRoleNameAsync(role) {
  if (!role) return null;
  
  // Если роль уже строка и не ObjectId
  if (typeof role === 'string' && role.length !== 24) {
    return role;
  }
  
  // Если роль - объект с полем name
  if (role && typeof role === 'object' && role.name) {
    return role.name;
  }
  
  // Если это ObjectId, получаем роль из базы данных
  if (typeof role === 'string' && role.length === 24) {
    try {
      const Role = require('../models/Role');
      const roleDoc = await Role.findById(role);
      return roleDoc ? roleDoc.name : null;
    } catch (error) {
      console.error('Ошибка получения роли из базы данных:', error.message);
      return null;
    }
  }
  
  // Если роль - ObjectId объект
  if (role && typeof role === 'object' && (role._id || role.toString)) {
    try {
      const Role = require('../models/Role');
      const roleId = role._id || role.toString();
      const roleDoc = await Role.findById(roleId);
      return roleDoc ? roleDoc.name : null;
    } catch (error) {
      console.error('Ошибка получения роли из ObjectId объекта:', error.message);
      return null;
    }
  }
  
  return null;
}

/**
 * Асинхронная проверка доступа к админ-панели
 * @param {Object} user - Объект пользователя
 * @returns {Promise<boolean>} - true если пользователь имеет доступ к админ-панели
 */
async function hasAdminAccessAsync(user) {
  if (!user || !user.role) return false;
  
  const roleName = await getRoleNameAsync(user.role);
  return roleName === 'admin' || roleName === 'brand_representative';
}

module.exports = {
  getRoleName,
  getRoleNameAsync,
  isAdmin,
  isBrandRepresentative,
  isBartender,
  hasAdminAccess,
  hasAdminAccessAsync,
  getRoleDisplayName
};