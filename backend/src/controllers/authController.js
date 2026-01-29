// backend/src/controllers/authController.js
const { User, Business } = require('../models');
const { generateToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 */
async function login(req, res) {
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
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res) {
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
}

/**
 * PUT /api/auth/profile
 */
async function updateProfile(req, res) {
  try {
    const { name, businessName } = req.body;

    // Validate input - at least one field must be provided
    if (!name && !businessName) {
      return res.status(400).json({
        success: false,
        error: 'At least one field (name or businessName) is required',
      });
    }

    // Update user name if provided
    if (name) {
      req.user.name = name;
      await req.user.save();
    }

    // Update business name if provided
    if (businessName) {
      req.business.name = businessName;
      await req.business.save();
    }

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
        },
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
}

/**
 * POST /api/auth/register
 */
async function register(req, res) {
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
}

module.exports = {
  login,
  getMe,
  updateProfile,
  register,
};