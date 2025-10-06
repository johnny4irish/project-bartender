const express = require('express')
const router = express.Router()
const { getModel, checkConnection } = require('../models/ModelFactory')
const fs = require('fs')
const path = require('path')

// Get models from ModelFactory
const City = getModel('City')
const Bar = getModel('Bar')
const Role = getModel('Role')
const Product = getModel('Product')
const Brand = getModel('Brand')

// @route   GET api/data/cities
// @desc    Получить все города
// @access  Public
router.get('/cities', async (req, res) => {
  try {
    if (!checkConnection()) {
      // Фолбэк к локальному экспорту
      const filePath = path.join(__dirname, '..', 'atlas-export', 'city.json')
      try {
        const raw = fs.readFileSync(filePath, 'utf8')
        const data = JSON.parse(raw)
        const cities = Array.isArray(data) ? data.map(c => ({ _id: c._id || c.id || c._doc?._id, name: c.name })) : []
        return res.json(cities)
      } catch (e) {
        console.warn('Fallback cities load failed:', e.message)
        return res.json([])
      }
    }
    const cities = await City.find().select('_id name')
    res.json(cities)
  } catch (err) {
    console.error('Error fetching cities:', err.message)
    res.status(500).send('Server error')
  }
})

// @route   GET api/data/bars
// @desc    Получить все бары
// @access  Public
router.get('/bars', async (req, res) => {
  try {
    if (!checkConnection()) {
      const filePath = path.join(__dirname, '..', 'atlas-export', 'bar.json')
      try {
        const raw = fs.readFileSync(filePath, 'utf8')
        const data = JSON.parse(raw)
        const bars = Array.isArray(data) ? data.map(b => ({ _id: b._id || b.id || b._doc?._id, name: b.name, city: b.city })) : []
        return res.json(bars)
      } catch (e) {
        console.warn('Fallback bars load failed:', e.message)
        return res.json([])
      }
    }
    const bars = await Bar.find().select('_id name city').populate('city', 'name')
    res.json(bars)
  } catch (err) {
    console.error('Error fetching bars:', err.message)
    res.status(500).send('Server error')
  }
})

// @route   GET api/data/roles
// @desc    Получить все роли
// @access  Public
router.get('/roles', async (req, res) => {
  try {
    if (!checkConnection()) {
      const filePath = path.join(__dirname, '..', 'atlas-export', 'role.json')
      try {
        const raw = fs.readFileSync(filePath, 'utf8')
        const data = JSON.parse(raw)
        const roles = Array.isArray(data) ? data.map(r => ({ _id: r._id || r.id || r._doc?._id, name: r.name, displayName: r.displayName || r.name })) : []
        return res.json(roles)
      } catch (e) {
        console.warn('Fallback roles load failed:', e.message)
        return res.json([])
      }
    }
    const roles = await Role.getActive().select('_id name displayName')
    res.json(roles)
  } catch (err) {
    console.error('Error fetching roles:', err.message)
    res.status(500).send('Server error')
  }
})

// @route   GET api/data/products
// @desc    Получить все активные продукты
// @access  Public
router.get('/products', async (req, res) => {
  try {
    if (!checkConnection()) {
      const filePath = path.join(__dirname, '..', 'data', 'products.json')
      try {
        const raw = fs.readFileSync(filePath, 'utf8')
        const data = JSON.parse(raw)
        const products = Array.isArray(data) ? data.map(p => ({
          _id: p._id || p.id || p._doc?._id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          pointsPerRuble: p.pointsPerRuble,
          pointsCalculationType: p.pointsCalculationType,
          pointsPerPortion: p.pointsPerPortion,
          portionSizeGrams: p.portionSizeGrams
        })) : []
        return res.json(products)
      } catch (e) {
        console.warn('Fallback products load failed:', e.message)
        return res.json([])
      }
    }
    const products = await Product.find({ isActive: true })
      .select('_id name brand category pointsPerRuble pointsCalculationType pointsPerPortion portionSizeGrams')
      .sort({ name: 1 })
    res.json(products)
  } catch (err) {
    console.error('Error fetching products:', err.message)
    res.status(500).send('Server error')
  }
})

// @route   GET api/data/brands
// @desc    Получить все бренды (публично)
// @access  Public
router.get('/brands', async (req, res) => {
  try {
    if (!checkConnection()) {
      const filePath = path.join(__dirname, '..', 'atlas-export', 'brand.json')
      try {
        const raw = fs.readFileSync(filePath, 'utf8')
        const data = JSON.parse(raw)
        const brands = Array.isArray(data) ? data.map(b => ({ _id: b._id || b.id || b._doc?._id, name: b.name, displayName: b.displayName || b.name })) : []
        return res.json(brands)
      } catch (e) {
        console.warn('Fallback brands load failed:', e.message)
        return res.json([])
      }
    }
    const brands = await Brand.find()
      .select('_id name displayName')
      .sort({ name: 1 })
    res.json(brands)
  } catch (err) {
    console.error('Error fetching brands:', err.message)
    res.status(500).send('Server error')
  }
})

module.exports = router