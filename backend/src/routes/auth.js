const express = require('express');
const router = express.Router();
const { User, Business } = require('../models');
const { generateToken, authenticate } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Find user by email (include passwordHash for comparison)
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+passwordHash')
      .populate('businessId');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        business: {
          id: user.businessId._id,
          name: user.businessId.name,
          email: user.businessId.email,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
        },
        business: {
          id: req.business._id,
          name: req.business.name,
          email: req.business.email,
          invoicePrefix: req.business.invoicePrefix,
        },
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
    });
  }
});

/**
 * POST /api/auth/register
 * Register new business and owner user
 * (Simplified - for demo purposes)
 */
router.post('/register', async (req, res) => {
  try {
    const { businessName, email, password, name } = req.body;

    // Validate input
    if (!businessName || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: businessName, email, password, name',
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
    }

    // Create business
    const business = await Business.create({
      name: businessName,
      email: email.toLowerCase(),
    });

    // Create owner user
    const user = await User.create({
      businessId: business._id,
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by pre-save hook
      name,
      role: 'owner',
    });

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        business: {
          id: business._id,
          name: business.name,
          email: business.email,
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

module.exports = router;
