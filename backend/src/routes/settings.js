/**
 * Settings Routes
 *
 * API endpoints for configuring business settings:
 * - Payout addresses (BTC, ETH, SOL)
 * - Nessie (fiat) account connection
 * - Default invoice settings
 */

const express = require('express');
const router = express.Router();
const { Business } = require('../models');
const { authenticate } = require('../middleware/auth');
const { requireBusiness } = require('../utils/businessScope');
const { nessie, chains } = require('../services');

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
        btc: business.payoutAddresses?.btc || '',
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
router.put('/payout-addresses', async (req, res) => {
  try {
    const { btc, eth, sol } = req.body;

    // Validate addresses if provided
    const errors = [];
    if (btc && !chains.isValidAddress('BTC', btc)) {
      errors.push('Invalid Bitcoin address format');
    }
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
          btc: btc || '',
          eth: eth || '',
          sol: sol || '',
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      data: {
        btc: business.payoutAddresses.btc,
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

// ========== NESSIE (FIAT) CONFIGURATION ==========

/**
 * GET /api/settings/nessie
 * Get Nessie account configuration
 */
router.get('/nessie', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    let accountDetails = null;
    let accountValid = false;
    let isSimulated = false;

    if (business.nessieAccountId) {
      // Check if this is a simulated account
      if (nessie.isSimulatedAccount(business.nessieAccountId)) {
        accountValid = true;
        isSimulated = true;
        accountDetails = nessie.getSimulatedAccountDetails(business.nessieAccountId);
      } else {
        try {
          accountDetails = await nessie.getAccount(business.nessieAccountId);
          accountValid = true;
        } catch (err) {
          // Account not found or API error
          console.warn('Nessie account fetch failed:', err.message);
        }
      }
    }

    res.json({
      success: true,
      data: {
        accountId: business.nessieAccountId || '',
        accountValid,
        accountDetails,
        simulated: isSimulated,
      },
    });
  } catch (error) {
    console.error('Get Nessie config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Nessie configuration',
    });
  }
});

/**
 * PUT /api/settings/nessie
 * Connect Nessie account
 */
router.put('/nessie', async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      // Allow disconnecting account
      const business = await Business.findByIdAndUpdate(
        req.businessId,
        { nessieAccountId: null },
        { new: true }
      );

      return res.json({
        success: true,
        data: {
          accountId: '',
          accountValid: false,
          accountDetails: null,
          message: 'Nessie account disconnected',
        },
      });
    }

    // Verify account exists
    const isValid = await nessie.verifyAccount(accountId);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Nessie account ID. Please check the account ID and try again.',
      });
    }

    const business = await Business.findByIdAndUpdate(
      req.businessId,
      { nessieAccountId: accountId },
      { new: true }
    );

    // Fetch account details to return
    let accountDetails = null;
    try {
      accountDetails = await nessie.getAccount(accountId);
    } catch (err) {
      // Non-critical, continue
    }

    res.json({
      success: true,
      data: {
        accountId: business.nessieAccountId,
        accountValid: true,
        accountDetails,
      },
    });
  } catch (error) {
    console.error('Update Nessie config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Nessie configuration',
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

// ========== NESSIE BALANCE & TRANSACTIONS ==========

/**
 * GET /api/settings/nessie/balance
 * Get Nessie account balance
 */
router.get('/nessie/balance', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    if (!business.nessieAccountId) {
      return res.status(400).json({
        success: false,
        error: 'No Nessie account connected',
      });
    }

    // For simulated accounts, calculate balance from cashout totals
    if (nessie.isSimulatedAccount(business.nessieAccountId)) {
      const stats = await nessie.getCashoutStats(req.businessId);
      const balance = stats.totalCents / 100;
      return res.json({
        success: true,
        data: {
          accountId: business.nessieAccountId,
          balance,
          formattedBalance: `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          simulated: true,
        },
      });
    }

    // For real accounts, try the Nessie API
    try {
      const balance = await nessie.getAccountBalance(business.nessieAccountId);
      res.json({
        success: true,
        data: {
          accountId: business.nessieAccountId,
          balance,
          formattedBalance: `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        },
      });
    } catch (apiError) {
      // If API fails, return balance from cashouts for demo resilience
      console.warn('Nessie balance fetch failed, using cashout data:', apiError.message);
      const stats = await nessie.getCashoutStats(req.businessId);
      const balance = stats.totalCents / 100;
      res.json({
        success: true,
        data: {
          accountId: business.nessieAccountId,
          balance,
          formattedBalance: `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          simulated: true,
        },
      });
    }
  } catch (error) {
    console.error('Get Nessie balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Nessie balance',
    });
  }
});

/**
 * GET /api/settings/nessie/transactions
 * Get Nessie transaction history
 */
router.get('/nessie/transactions', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    if (!business.nessieAccountId) {
      return res.status(400).json({
        success: false,
        error: 'No Nessie account connected',
      });
    }

    const limit = parseInt(req.query.limit, 10) || 20;

    // For simulated accounts, skip API and use cashouts directly
    if (nessie.isSimulatedAccount(business.nessieAccountId)) {
      const cashouts = await nessie.getCashoutsByBusiness(req.businessId, { limit });
      const simulatedTransactions = cashouts.map((c) => ({
        id: c.nessieTransferId || c._id.toString(),
        type: 'deposit',
        amount: c.amountCents / 100,
        description: 'Nova Invoice Payment',
        status: c.status.toLowerCase(),
        date: c.completedAt || c.createdAt,
        invoiceId: c.invoiceId,
        simulated: true,
      }));

      return res.json({
        success: true,
        data: {
          accountId: business.nessieAccountId,
          transactions: simulatedTransactions,
          count: simulatedTransactions.length,
          simulated: true,
        },
      });
    }

    // For real accounts, try the Nessie API
    try {
      const transactions = await nessie.getAllTransactions(business.nessieAccountId, { limit });
      res.json({
        success: true,
        data: {
          accountId: business.nessieAccountId,
          transactions,
          count: transactions.length,
        },
      });
    } catch (apiError) {
      // If API fails, return simulated transactions for demo resilience
      console.warn('Nessie transactions fetch failed, using simulated data:', apiError.message);

      // Get Nova cashouts as simulated transactions
      const cashouts = await nessie.getCashoutsByBusiness(req.businessId, { limit });
      const simulatedTransactions = cashouts.map((c) => ({
        id: c.nessieTransferId || c._id.toString(),
        type: 'deposit',
        amount: c.amountCents / 100,
        description: 'Nova Invoice Payment',
        status: c.status.toLowerCase(),
        date: c.completedAt || c.createdAt,
        invoiceId: c.invoiceId,
        simulated: true,
      }));

      res.json({
        success: true,
        data: {
          accountId: business.nessieAccountId,
          transactions: simulatedTransactions,
          count: simulatedTransactions.length,
          simulated: true,
        },
      });
    }
  } catch (error) {
    console.error('Get Nessie transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Nessie transactions',
    });
  }
});

// ========== NESSIE PROVISIONING ==========

/**
 * POST /api/settings/nessie/provision
 * Auto-provision a new Nessie customer and account
 * Creates both customer and account in one call
 */
router.post('/nessie/provision', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    // Check if already has account
    if (business.nessieAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Nessie account already connected. Disconnect first to provision a new one.',
      });
    }

    const { firstName, lastName, address } = req.body;

    // Use business name if no name provided
    const customerFirstName = firstName || business.name.split(' ')[0] || 'Nova';
    const customerLastName = lastName || business.name.split(' ').slice(1).join(' ') || 'Business';

    try {
      // Step 1: Create customer
      const customer = await nessie.createCustomer({
        firstName: customerFirstName,
        lastName: customerLastName,
        address: address || {},
      });

      const customerId = customer._id;

      // Step 2: Create account for customer
      const account = await nessie.createAccount(customerId, {
        type: 'Checking',
        nickname: `${business.name} - Nova Payout`,
        balance: 0,
      });

      const accountId = account._id;

      // Step 3: Update business with both IDs
      business.nessieCustomerId = customerId;
      business.nessieAccountId = accountId;
      await business.save();

      res.json({
        success: true,
        data: {
          customerId,
          accountId,
          customer,
          account,
          message: 'Nessie account provisioned successfully',
        },
      });
    } catch (apiError) {
      console.error('Nessie provisioning failed:', apiError.message);

      // For demo resilience, simulate success
      const simulatedCustomerId = 'sim_cust_' + Date.now();
      const simulatedAccountId = 'sim_acct_' + Date.now();

      business.nessieCustomerId = simulatedCustomerId;
      business.nessieAccountId = simulatedAccountId;
      await business.save();

      res.json({
        success: true,
        data: {
          customerId: simulatedCustomerId,
          accountId: simulatedAccountId,
          simulated: true,
          message: 'Nessie account simulated (API unavailable)',
        },
      });
    }
  } catch (error) {
    console.error('Nessie provision error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to provision Nessie account',
    });
  }
});

/**
 * GET /api/settings/nessie/discover
 * Discover available Nessie accounts for the API key
 */
router.get('/nessie/discover', async (req, res) => {
  try {
    // Get all accounts visible to the API key
    const [accounts, customers] = await Promise.all([
      nessie.listAccounts().catch(() => []),
      nessie.listCustomers().catch(() => []),
    ]);

    // Build a map of customer IDs to customer info
    const customerMap = {};
    customers.forEach((c) => {
      customerMap[c._id] = c;
    });

    // Enrich accounts with customer info
    const enrichedAccounts = accounts.map((acct) => ({
      id: acct._id,
      type: acct.type,
      nickname: acct.nickname,
      balance: acct.balance,
      customerId: acct.customer_id,
      customer: customerMap[acct.customer_id] || null,
    }));

    res.json({
      success: true,
      data: {
        accounts: enrichedAccounts,
        customers,
        accountCount: accounts.length,
        customerCount: customers.length,
      },
    });
  } catch (error) {
    console.error('Nessie discover error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to discover Nessie accounts',
    });
  }
});

/**
 * GET /api/settings/nessie/customer
 * Get customer info for the connected account
 */
router.get('/nessie/customer', async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    if (!business.nessieAccountId) {
      return res.status(400).json({
        success: false,
        error: 'No Nessie account connected',
      });
    }

    try {
      const customer = await nessie.getCustomerByAccount(business.nessieAccountId);
      res.json({
        success: true,
        data: {
          customer,
          customerId: customer._id,
        },
      });
    } catch (apiError) {
      // Return simulated customer for demo resilience
      res.json({
        success: true,
        data: {
          customer: {
            _id: business.nessieCustomerId || 'simulated',
            first_name: business.name.split(' ')[0] || 'Nova',
            last_name: business.name.split(' ').slice(1).join(' ') || 'Business',
            address: {
              street_number: '1',
              street_name: 'Main St',
              city: 'Boston',
              state: 'MA',
              zip: '02101',
            },
          },
          simulated: true,
        },
      });
    }
  } catch (error) {
    console.error('Get Nessie customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Nessie customer',
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

    // Check Nessie account validity
    let nessieAccountValid = false;
    let nessieAccountDetails = null;
    let nessieSimulated = false;

    if (business.nessieAccountId) {
      // Check if this is a simulated account
      if (nessie.isSimulatedAccount(business.nessieAccountId)) {
        nessieAccountValid = true;
        nessieSimulated = true;
        nessieAccountDetails = nessie.getSimulatedAccountDetails(business.nessieAccountId);
      } else {
        try {
          nessieAccountDetails = await nessie.getAccount(business.nessieAccountId);
          nessieAccountValid = true;
        } catch (err) {
          // Account invalid
        }
      }
    }

    // Get customer info if account is connected
    let nessieCustomer = null;
    if (business.nessieAccountId && nessieAccountValid) {
      // For simulated accounts, return simulated customer
      if (nessieSimulated) {
        nessieCustomer = nessie.getSimulatedCustomerDetails(
          business.nessieCustomerId || 'sim_cust_unknown',
          business.name
        );
      } else {
        try {
          nessieCustomer = await nessie.getCustomerByAccount(business.nessieAccountId);
        } catch (err) {
          // Non-critical, continue
        }
      }
    }

    res.json({
      success: true,
      data: {
        payoutAddresses: {
          btc: business.payoutAddresses?.btc || '',
          eth: business.payoutAddresses?.eth || '',
          sol: business.payoutAddresses?.sol || '',
        },
        nessie: {
          accountId: business.nessieAccountId || '',
          customerId: business.nessieCustomerId || '',
          accountValid: nessieAccountValid,
          accountDetails: nessieAccountDetails,
          customer: nessieCustomer,
          simulated: nessieSimulated,
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
