/**
 * Settings Routes
 *
 * API endpoints for configuring business settings:
 * - Payout addresses (ETH, SOL) - MVP: no Bitcoin
 * - Default invoice settings
 */

const express = require('express');
const router = express.Router();
const { Business } = require('../models');
const { authenticate } = require('../middleware/auth');
const { requireBusiness } = require('../utils/businessScope');
const { requireRole } = require('../utils/requireRole');
const { chains } = require('../services');

// All settings routes require authentication
router.use(authenticate, requireBusiness);

// ========== PAYOUT ADDRESSES ==========

/**
 * GET /api/settings/payout-addresses
 * Get merchant's payout addresses for all chains
 */
router.get('/payout-addresses', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    res.json({
      success: true,
      data: {
        eth: business.payoutAddresses?.eth || '',
        sol: business.payoutAddresses?.sol || '',
      },
    });
  } catch (error) {
    console.error('Get payout addresses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payout addresses',
    });
  }
});

/**
 * PUT /api/settings/payout-addresses
 * Update merchant's payout addresses
 */
router.put('/payout-addresses', requireRole('owner'), async (req, res) => {
  try {
    const { eth, sol } = req.body;

    const errors = [];
    if (eth && !chains.isValidAddress('ETH', eth)) {
      errors.push('Invalid Ethereum address format');
    }
    if (sol && !chains.isValidAddress('SOL', sol)) {
      errors.push('Invalid Solana address format');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join(', '),
      });
    }

    const business = await Business.findByIdAndUpdate(
      req.businessId,
      {
        payoutAddresses: {
          eth: eth || '',
          sol: sol || '',
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      data: {
        eth: business.payoutAddresses.eth,
        sol: business.payoutAddresses.sol,
      },
    });
  } catch (error) {
    console.error('Update payout addresses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payout addresses',
    });
  }
});

// ========== DEFAULT SETTINGS ==========

/**
 * GET /api/settings/defaults
 * Get default invoice settings
 */
router.get('/defaults', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    res.json({
      success: true,
      data: {
        defaultSettlementTarget: business.defaultSettlementTarget || 'USD',
        defaultConversionMode: business.defaultConversionMode || 'MODE_A',
      },
    });
  } catch (error) {
    console.error('Get default settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get default settings',
    });
  }
});

/**
 * PUT /api/settings/defaults
 * Update default invoice settings
 */
router.put('/defaults', async (req, res) => {
  try {
    const { defaultSettlementTarget, defaultConversionMode } = req.body;

    // Validate values
    const validTargets = ['BTC', 'ETH', 'SOL', 'USD'];
    const validModes = ['MODE_A', 'MODE_B'];

    if (defaultSettlementTarget && !validTargets.includes(defaultSettlementTarget)) {
      return res.status(400).json({
        success: false,
        error: `Invalid settlement target. Must be one of: ${validTargets.join(', ')}`,
      });
    }

    if (defaultConversionMode && !validModes.includes(defaultConversionMode)) {
      return res.status(400).json({
        success: false,
        error: `Invalid conversion mode. Must be one of: ${validModes.join(', ')}`,
      });
    }

    const updateFields = {};
    if (defaultSettlementTarget) updateFields.defaultSettlementTarget = defaultSettlementTarget;
    if (defaultConversionMode) updateFields.defaultConversionMode = defaultConversionMode;

    const business = await Business.findByIdAndUpdate(req.businessId, updateFields, { new: true });

    res.json({
      success: true,
      data: {
        defaultSettlementTarget: business.defaultSettlementTarget,
        defaultConversionMode: business.defaultConversionMode,
      },
    });
  } catch (error) {
    console.error('Update default settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update default settings',
    });
  }
});

// ========== ALL SETTINGS ==========

/**
 * GET /api/settings
 * Get all settings in one request
 */
router.get('/', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    res.json({
      success: true,
      data: {
        payoutAddresses: {
          eth: business.payoutAddresses?.eth || '',
          sol: business.payoutAddresses?.sol || '',
        },
        defaults: {
          defaultSettlementTarget: business.defaultSettlementTarget || 'USD',
          defaultConversionMode: business.defaultConversionMode || 'MODE_A',
        },
      },
    });
  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get settings',
    });
  }
});

module.exports = router;
