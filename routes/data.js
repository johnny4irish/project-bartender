const express = require('express')
const router = express.Router()
const { getModel } = require('../models/ModelFactory')

// Get models from ModelFactory
const City = getModel('City')
const Bar = getModel('Bar')
const Role = getModel('Role')
const Product = getModel('Product')

// @route   GET api/data/cities
// @desc    Получить все города
// @access  Public
router.get('/cities', async (req, res) => {
  try {
    console.log('Cities endpoint called - fetching cities...')
    const cities = await City.find().select('_id name')
    console.log('Cities found:', cities.length)
    console.log('Cities data:', JSON.stringify(cities, null, 2))
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
    const roles = await Role.find().select('_id name')
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
    const products = await Product.find({ isActive: true })
      .select('_id name brand category pointsPerRuble pointsCalculationType pointsPerPortion portionSizeGrams')
      .sort({ name: 1 })
    res.json(products)
  } catch (err) {
    console.error('Error fetching products:', err.message)
    res.status(500).send('Server error')
  }
})

module.exports = router