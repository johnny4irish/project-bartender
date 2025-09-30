const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { collections, saveUsers } = require('../config/db');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  bar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bar',
    required: true
  },
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  points: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  availableBalance: {
    type: Number,
    default: 0
  },
  withdrawnAmount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Виртуальные поля для популяции
userSchema.virtual('barInfo', {
  ref: 'Bar',
  localField: 'bar',
  foreignField: '_id',
  justOne: true
});

userSchema.virtual('cityInfo', {
  ref: 'City',
  localField: 'city',
  foreignField: '_id',
  justOne: true
});

userSchema.virtual('roleInfo', {
  ref: 'Role',
  localField: 'role',
  foreignField: '_id',
  justOne: true
});

// Методы для работы с популяцией
userSchema.methods.populateRefs = function() {
  return this.populate(['bar', 'city', 'role']);
};

userSchema.statics.findWithRefs = function(query = {}) {
  return this.find(query).populate(['bar', 'city', 'role']);
};

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Создаем модель MongoDB
const MongoUser = mongoose.model('User', userSchema);

// Класс для построения запросов (аналог Mongoose Query)
class QueryBuilder {
  constructor(users) {
    this.users = users;
    this._selectedFields = null;
    this._sortOptions = null;
    this._limitValue = null;
    this._skipValue = null;
  }

  select(fields) {
    this._selectedFields = fields;
    return this;
  }

  sort(sortObj) {
    this._sortOptions = sortObj;
    return this;
  }

  limit(limitNum) {
    this._limitValue = limitNum;
    return this;
  }

  skip(skipNum) {
    this._skipValue = skipNum;
    return this;
  }

  // Выполнение запроса и возврат результата
  then(resolve, reject) {
    try {
      let result = [...this.users];

      // Применяем сортировку
      if (this._sortOptions) {
        if (this._sortOptions.createdAt === -1) {
          result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (this._sortOptions.points === -1) {
          result.sort((a, b) => b.points - a.points);
        }
      }

      // Применяем skip
      if (this._skipValue) {
        result = result.slice(this._skipValue);
      }

      // Применяем limit
      if (this._limitValue) {
        result = result.slice(0, this._limitValue);
      }

      // Применяем select (исключение полей)
      if (this._selectedFields === '-password') {
        result = result.map(user => {
          const userObj = { ...user };
          delete userObj.password;
          return userObj;
        });
      }

      resolve(result);
    } catch (error) {
      reject(error);
    }
  }

  // Поддержка async/await
  catch(reject) {
    return this.then(null, reject);
  }
}

// Export the MongoDB model directly
module.exports = MongoUser;