const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const { connectDB } = require('./config/db')

// Load env vars
dotenv.config()

// Force Railway redeploy - Updated CORS configuration
// Connect to database
connectDB()

const app = express()

// Body parser middleware
app.use(express.json({ extended: false }))

// CORS middleware (allow localhost:3000 and localhost:3001 in dev)
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.CORS_ORIGIN,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:5001'
    ].filter(Boolean)

    // Allow non-browser requests (no origin) and allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))

// Security and performance middlewares
app.use(helmet())
app.use(compression())
app.use(morgan('combined'))

// Basic rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
})
app.use('/api/', apiLimiter)

// Static folder for uploads
app.use('/uploads', express.static('uploads'))

// Temporary debug endpoint for JWT
app.get('/api/debug/jwt', (req, res) => {
  res.json({
    jwt_secret_exists: !!process.env.JWT_SECRET,
    jwt_secret_length: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
    jwt_secret_preview: process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'undefined'
  });
});

// Define Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/sales', require('./routes/sales'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/gamification', require('./routes/gamification'))
app.use('/api/payments', require('./routes/payments'))
app.use('/api/stats', require('./routes/stats'))
app.use('/api/data', require('./routes/data'))
// app.use('/api/users', require('./routes/users'))
// app.use('/api/prizes', require('./routes/prizes'))
// app.use('/api/transactions', require('./routes/transactions'))

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', timestamp: new Date().toISOString() })
})

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Something went wrong!' })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`)
})