/**
 * Утилиты для работы с ролями пользователей
 * Централизованная логика проверки ролей для всего приложения
 */

// Базовые роли приложения
const Roles = {
  ADMIN: 'admin',
  MANUFACTURER: 'brand_representative',
  BAR: 'bar_manager',
  BARTENDER: 'bartender',
  TEST_BARTENDER: 'test_bartender',
};

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
 * Проверяет, является ли пользователь менеджером бара
 * @param {Object} user - Объект пользователя
 * @returns {boolean} - true если пользователь менеджер бара
 */
function isBarManager(user) {
  if (!user || !user.role) return false;
  const roleName = getRoleName(user.role);
  return roleName === 'bar_manager' || roleName === 'bar';
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
      return 'Производитель/Дистрибьютор';
    case 'bar_manager':
      return 'Менеджер бара';
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
  return roleName === Roles.ADMIN || roleName === Roles.MANUFACTURER;
}

/**
 * Асинхронная проверка доступа к модерации продаж
 * Разрешено: администратор, представитель бренда, менеджер бара
 * @param {Object} user - Объект пользователя
 * @returns {Promise<boolean>} - true если пользователь имеет доступ к модерации
 */
async function hasModerationAccessAsync(user) {
  if (!user || !user.role) return false;
  const roleName = await getRoleNameAsync(user.role);
  return roleName === Roles.ADMIN || roleName === Roles.MANUFACTURER || roleName === Roles.BAR;
}

/**
 * Построение scope‑фильтра для ресурсов по роли пользователя
 * Возвращает объект фильтра для MongoDB/Mongoose
 * @param {Object} user
 * @param {string} [resource='sales']
 * @returns {Object}
 */
function buildScopeFilter(user, resource = 'sales') {
  const roleName = getRoleName(user.role);
  if (!roleName) return {};

  // Администратор — без ограничений
  if (roleName === Roles.ADMIN) return {};

  // Представитель бренда — ограничение по брендам
  if (roleName === Roles.MANUFACTURER) {
    // В текущей модели продажи хранят brand как строку
    // Ожидаем наличие user.brandNames (список строк) или user.brandIds для будущих расширений
    const brandNames = Array.isArray(user.brandNames) ? user.brandNames : [];
    if (brandNames.length > 0) {
      return { brand: { $in: brandNames } };
    }
    // Если привязки брендов нет — возвращаем пустой результат по умолчанию
    // чтобы не раскрывать чужие данные
    return { brand: '__none__' };
  }

  // Менеджер бара — ограничение по заведению
  if (roleName === Roles.BAR || roleName === 'bar') {
    return { bar: user.bar };
  }

  // Бармен — ограничение по пользователю
  if (roleName === Roles.BARTENDER || roleName === Roles.TEST_BARTENDER) {
    return { user: user._id || user.id };
  }

  return {};
}

module.exports = {
  getRoleName,
  getRoleNameAsync,
  isAdmin,
  isBrandRepresentative,
  isBartender,
  isBarManager,
  hasAdminAccess,
  hasAdminAccessAsync,
  hasModerationAccessAsync,
  getRoleDisplayName,
  Roles,
  buildScopeFilter
};