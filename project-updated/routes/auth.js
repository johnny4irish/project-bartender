const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { getModel } = require('../models/ModelFactory')
const User = getModel('User')
const Role = getModel('Role')
const { collections, saveUsers } = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('bar').notEmpty().withMessage('Bar is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('role').notEmpty().withMessage('Role is required')
], async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, bar, city, role } = req.body;
    console.log('Extracted data:', { name, email, phone, bar, city, role });

    // Если MongoDB недоступна — используем файловую базу
    let user;
    if (mongoose.connection.readyState === 1) {
      console.log('Checking if user exists (MongoDB)...');
      user = await User.findOne({ email });
      if (user) {
        console.log('User already exists:', email);
        return res.status(400).json({ message: 'User already exists' });
      }
      console.log('User does not exist, validating role and creating user (MongoDB)...');

      // Validate role exists and is active; support ObjectId or name
      let roleDoc = null;
      if (mongoose.Types.ObjectId.isValid(role)) {
        roleDoc = await Role.findById(role);
      } else {
        roleDoc = await Role.findOne({ name: String(role).toLowerCase() });
      }
      if (!roleDoc || !roleDoc.isActive) {
        console.log('Invalid or inactive role during registration:', role);
        return res.status(400).json({ message: 'Недопустимая роль для регистрации' });
      }

      user = new User({ name, email, password, phone, bar, city, role: roleDoc._id });
      console.log('User created, saving (MongoDB)...');
      await user.save();
      console.log('User saved successfully:', user._id);
    } else {
      console.log('MongoDB disconnected. Using file-based users for registration.');
      // Проверка существования по email в файловой базе
      const existing = Array.from(collections.users.values()).find(u => (u.email || '').toLowerCase() === email.toLowerCase());
      if (existing) {
        console.log('User already exists (file-based):', email);
        return res.status(400).json({ message: 'User already exists' });
      }

      // Хэшируем пароль
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);

      const crypto = require('crypto');
      const newId = 'u_' + crypto.randomBytes(8).toString('hex');
      // В файловом режиме сохраняем роль как строковый ObjectId, если он был определен
      const roleValueForFile = mongoose.Types.ObjectId.isValid(role) ? role : String(role);

      user = {
        _id: newId,
        name,
        email,
        password: hashed,
        phone,
        bar,
        city,
        role: roleValueForFile,
        points: 0,
        totalEarnings: 0,
        availableBalance: 0,
        withdrawnAmount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null
      };
      collections.users.set(newId, user);
      saveUsers();
      console.log('User saved to file-based storage:', newId);
    }

    // Create JWT token
    // Выровняем payload с /login и middleware: используем userId
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };
    console.log('Creating JWT token with payload:', payload);

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('JWT token created');

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        bar: user.bar,
        city: user.city,
        role: user.role,
        points: user.points
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route
router.post('/login', [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists()
], async (req, res) => {
  console.log('🔍 LOGIN REQUEST:', {
    email: req.body.email,
    hasPassword: !!req.body.password,
    timestamp: new Date().toISOString()
  });

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ VALIDATION ERRORS:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    console.log('🔍 Searching for user:', email);
    let user = null;
    if (mongoose.connection.readyState === 1) {
      // MongoDB
      user = await User.findOne({ email });
    } else {
      // Файловая база
      user = Array.from(collections.users.values()).find(u => (u.email || '').toLowerCase() === email.toLowerCase()) || null;
    }
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('✅ User found:', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      hasComparePassword: typeof user.comparePassword === 'function'
    });

    // Check password presence and validity
    if (!password || typeof password !== 'string' || password.length < 1) {
      console.log('❌ Password is missing or invalid in request for user:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.password || typeof user.password !== 'string') {
      console.log('❌ Stored password is missing or invalid for user:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    console.log('🔐 Checking password...');
    let isMatch = false;
    try {
      if (mongoose.connection.readyState === 1 && typeof user.comparePassword === 'function') {
        isMatch = await user.comparePassword(password);
      } else {
        isMatch = await bcrypt.compare(password, user.password);
      }
    } catch (cmpErr) {
      console.log('❌ Error during password comparison:', cmpErr.message);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    console.log('🔐 Password check result:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Invalid password for user:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('✅ Password valid, updating lastLogin...');
    // Update last login without triggering full validation
    if (mongoose.connection.readyState === 1) {
      await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });
      console.log('✅ LastLogin updated via updateOne');
    } else {
      user.lastLogin = new Date();
      if (user._id && collections.users.has(user._id)) {
        collections.users.set(user._id, user);
        saveUsers();
      }
      console.log('✅ LastLogin updated in file-based storage');
    }

    console.log('🎯 Creating JWT token...');
    // Create JWT token
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('JWT payload:', payload);

  jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) {
          console.error('❌ JWT signing error:', err);
          return res.status(500).json({ message: 'Server error' });
        }
        
        console.log('✅ JWT token created successfully');
        console.log('Token length:', token.length);
        // Set HttpOnly cookie for token
        try {
          const isProd = process.env.NODE_ENV === 'production';
          res.cookie('token', token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24h
          });
          console.log('✅ JWT cookie set (httpOnly)');
        } catch (cookieErr) {
          console.error('❌ Error setting cookie:', cookieErr);
        }

        const response = {
          message: 'Login successful',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            points: user.points,
            totalEarnings: user.totalEarnings,
            availableBalance: user.availableBalance
          }
        };
        
        console.log('✅ Sending successful response');
        res.json(response);
      }
    );
  } catch (err) {
    console.error('❌ LOGIN ERROR:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Logout route - clear JWT cookie
router.post('/logout', (req, res) => {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax'
    });
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('❌ LOGOUT ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    console.log('GET /me - req.user.id:', req.user.id);
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.user.id).populate('role');
    } else {
      user = collections.users.get(req.user.id) || null;
    }
    console.log('GET /me - найденный пользователь:', user);
    
    if (!user) {
      console.log('GET /me - пользователь не найден');
      return res.status(404).json({ message: 'User not found' });
    }

    // Удаляем пароль и возвращаем обычный объект
    const userObject = (typeof user.toObject === 'function') ? user.toObject() : { ...user };
    delete userObject.password;
    
    console.log('GET /me - отправляем пользователя:', userObject);
    res.json(userObject);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put('/profile', auth, [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('phone').optional().trim().isLength({ min: 10 }).withMessage('Phone number must be at least 10 characters'),
  body('bar').optional().trim().isLength({ min: 2 }).withMessage('Bar name must be at least 2 characters'),
  body('city').optional().trim().isLength({ min: 2 }).withMessage('City must be at least 2 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, bar, city } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (bar) updateFields.bar = bar;
    if (city) updateFields.city = city;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Удаляем пароль из объекта пользователя перед отправкой
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;

    res.json({
      message: 'Profile updated successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/change-password', auth, [
  body('currentPassword').exists().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;