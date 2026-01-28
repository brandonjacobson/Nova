// backend/src/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit'); // if you added it

// Login, with rate limiting
router.post('/login', loginLimiter, authController.login);

// Get current user + business
router.get('/me', authenticate, authController.getMe);

// Update profile
router.put('/profile', authenticate, authController.updateProfile);

// Register new business + owner
router.post('/register', authController.register);

module.exports = router;