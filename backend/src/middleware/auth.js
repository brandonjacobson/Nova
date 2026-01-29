const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { User } = require('../models');

if (!config.jwtSecret) {
  throw new Error('JWT secret not set in environment variables');
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user + business to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Get user from database
    const user = await User.findById(decoded.userId).populate('businessId');

    if (!user || !user.businessId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. User or businessnot found.',
      });
    }

    // Attach user and business to request
    req.user = user;
    req.businessId = user.businessId._id;
    req.business = user.businessId;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token.',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired.',
      });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed.',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.userId).populate('businessId');

    if (user) {
      req.user = user;
      req.businessId = user.businessId._id;
      req.business = user.businessId;
    }

    next();
  } catch (error) {
    // Token invalid, but that's okay for optional auth
    next();
  }
};

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      businessId: user.businessId.toString(),
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

module.exports = {
  authenticate,
  optionalAuth,
  generateToken,
};
