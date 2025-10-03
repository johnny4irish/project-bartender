const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  permissions: [{
    resource: {
      type: String,
      required: true,
      enum: ['users', 'products', 'sales', 'transactions', 'prizes', 'bars', 'cities', 'brands', 'categories', 'roles', 'reports', 'settings']
    },
    actions: [{
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'manage']
    }]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  color: {
    type: String,
    trim: true,
    default: '#6B7280'
  },
  icon: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
roleSchema.index({ name: 1 });
roleSchema.index({ isActive: 1, level: 1 });
roleSchema.index({ isSystem: 1 });

// Виртуальное поле для подсчета пользователей с этой ролью
roleSchema.virtual('userCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'role',
  count: true
});

// Методы экземпляра
roleSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

roleSchema.methods.deactivate = function() {
  if (this.isSystem) {
    throw new Error('Cannot deactivate system role');
  }
  this.isActive = false;
  return this.save();
};

roleSchema.methods.hasPermission = function(resource, action) {
  const permission = this.permissions.find(p => p.resource === resource);
  if (!permission) return false;
  
  return permission.actions.includes(action) || permission.actions.includes('manage');
};

roleSchema.methods.addPermission = function(resource, actions) {
  const existingPermission = this.permissions.find(p => p.resource === resource);
  
  if (existingPermission) {
    // Добавляем новые действия к существующим
    const newActions = [...new Set([...existingPermission.actions, ...actions])];
    existingPermission.actions = newActions;
  } else {
    // Создаем новое разрешение
    this.permissions.push({ resource, actions });
  }
  
  return this.save();
};

roleSchema.methods.removePermission = function(resource, actions = null) {
  if (actions === null) {
    // Удаляем все разрешения для ресурса
    this.permissions = this.permissions.filter(p => p.resource !== resource);
  } else {
    // Удаляем конкретные действия
    const permission = this.permissions.find(p => p.resource === resource);
    if (permission) {
      permission.actions = permission.actions.filter(a => !actions.includes(a));
      if (permission.actions.length === 0) {
        this.permissions = this.permissions.filter(p => p.resource !== resource);
      }
    }
  }
  
  return this.save();
};

roleSchema.methods.canManage = function(otherRole) {
  if (this.level <= otherRole.level) return false;
  if (otherRole.isSystem && !this.hasPermission('roles', 'manage')) return false;
  return true;
};

// Статические методы
roleSchema.statics.getActive = function() {
  return this.find({ isActive: true }).sort({ level: -1, displayName: 1 });
};

roleSchema.statics.getSystem = function() {
  return this.find({ isSystem: true, isActive: true }).sort({ level: -1 });
};

roleSchema.statics.getCustom = function() {
  return this.find({ isSystem: false, isActive: true }).sort({ level: -1, displayName: 1 });
};

roleSchema.statics.findByName = function(name) {
  return this.findOne({ name: name.toLowerCase().trim() });
};

roleSchema.statics.findByLevel = function(minLevel, maxLevel = 10) {
  return this.find({ 
    level: { $gte: minLevel, $lte: maxLevel }, 
    isActive: true 
  }).sort({ level: -1 });
};

roleSchema.statics.createDefaultRoles = async function() {
  const defaultRoles = [
    {
      name: 'admin',
      displayName: 'Администратор',
      description: 'Полный доступ ко всем функциям системы',
      level: 10,
      isSystem: true,
      color: '#DC2626',
      icon: 'shield-check',
      permissions: [
        { resource: 'users', actions: ['manage'] },
        { resource: 'products', actions: ['manage'] },
        { resource: 'sales', actions: ['manage'] },
        { resource: 'transactions', actions: ['manage'] },
        { resource: 'prizes', actions: ['manage'] },
        { resource: 'bars', actions: ['manage'] },
        { resource: 'cities', actions: ['manage'] },
        { resource: 'brands', actions: ['manage'] },
        { resource: 'categories', actions: ['manage'] },
        { resource: 'roles', actions: ['manage'] },
        { resource: 'reports', actions: ['manage'] },
        { resource: 'settings', actions: ['manage'] }
      ]
    },
    {
      name: 'bartender',
      displayName: 'Бармен',
      description: 'Доступ к продажам и базовым функциям',
      level: 3,
      isSystem: true,
      color: '#059669',
      icon: 'user',
      permissions: [
        { resource: 'products', actions: ['read'] },
        { resource: 'sales', actions: ['create', 'read', 'update'] },
        { resource: 'transactions', actions: ['read'] },
        { resource: 'prizes', actions: ['read'] },
        { resource: 'users', actions: ['read'] }
      ]
    },
    {
      name: 'brand_representative',
      displayName: 'Производитель/Дистрибьютор',
      description: 'Доступ к продуктам своего бренда и отчетам',
      level: 5,
      isSystem: true,
      color: '#7C3AED',
      icon: 'briefcase',
      permissions: [
        { resource: 'products', actions: ['create', 'read', 'update'] },
        { resource: 'sales', actions: ['read'] },
        { resource: 'transactions', actions: ['read'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'brands', actions: ['read', 'update'] }
      ]
    },
    {
      name: 'bar_manager',
      displayName: 'Менеджер бара',
      description: 'Модерация продаж и управление заведением',
      level: 4,
      isSystem: true,
      color: '#2563EB',
      icon: 'building',
      permissions: [
        { resource: 'products', actions: ['read'] },
        { resource: 'sales', actions: ['read', 'update'] },
        { resource: 'transactions', actions: ['read'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'bars', actions: ['read', 'update'] },
        { resource: 'users', actions: ['read'] }
      ]
    },
    {
      name: 'test_bartender',
      displayName: 'Тест-бармен',
      description: 'Тестовая роль для отладки и пилотных запусков',
      level: 3,
      isSystem: true,
      color: '#10B981',
      icon: 'flask',
      permissions: [
        { resource: 'products', actions: ['read'] },
        { resource: 'sales', actions: ['create', 'read', 'update'] },
        { resource: 'transactions', actions: ['read'] },
        { resource: 'prizes', actions: ['read'] },
        { resource: 'users', actions: ['read'] }
      ]
    }
  ];

  for (const roleData of defaultRoles) {
    const existingRole = await this.findByName(roleData.name);
    if (!existingRole) {
      await this.create(roleData);
    }
  }
};

// Middleware для валидации перед сохранением
roleSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('name')) {
    this.name = this.name.toLowerCase().trim();
  }
  
  // Валидация уровня для системных ролей
  if (this.isSystem && this.level < 3) {
    return next(new Error('System roles must have level >= 3'));
  }
  
  // Очистка разрешений от дубликатов
  if (this.isModified('permissions')) {
    this.permissions.forEach(permission => {
      permission.actions = [...new Set(permission.actions)];
    });
  }
  
  next();
});

// Middleware для предотвращения удаления системных ролей
roleSchema.pre('deleteOne', { document: true, query: false }, function(next) {
  if (this.isSystem) {
    return next(new Error('Cannot delete system role'));
  }
  next();
});

roleSchema.pre('findOneAndDelete', function(next) {
  this.where({ isSystem: { $ne: true } });
  next();
});

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;