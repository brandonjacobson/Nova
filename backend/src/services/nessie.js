/**
 * Nessie (Capital One Sandbox) Service
 *
 * Integration with Capital One's Nessie API for fiat cashout.
 * Uses native fetch (Node 18+).
 * Simulates success on API failures for demo resilience.
 *
 * API Docs: http://api.nessieisreal.com
 */

const crypto = require('crypto');
const Cashout = require('../models/Cashout');
const config = require('../config/env');

// ========== CONSTANTS ==========

const NESSIE_BASE_URL = config.nessieBaseUrl || 'http://api.nessieisreal.com';

// ========== CASHOUT EXECUTION ==========

/**
 * Execute a fiat cashout to merchant's Nessie account
 * Creates a deposit in the merchant's bank account
 *
 * On API failure: Simulates success for demo resilience
 *
 * @param {object} params
 * @param {string} params.invoiceId - Invoice ID
 * @param {string} params.conversionId - Conversion record ID (optional)
 * @param {string} params.businessId - Business ID
 * @param {string} params.nessieAccountId - Merchant's Nessie account ID
 * @param {number} params.amountCents - USD cents to deposit
 * @param {string} params.description - Transaction description
 * @returns {Promise<Cashout>} - Cashout record
 */
async function executeCashout({
  invoiceId,
  conversionId = null,
  businessId,
  nessieAccountId,
  amountCents,
  description = 'Nova Invoice Payment',
}) {
  // Validate inputs
  if (!nessieAccountId) {
    throw new Error('Nessie account ID is required for cashout');
  }

  if (amountCents <= 0) {
    throw new Error('Cashout amount must be positive');
  }

  // Create cashout record (PROCESSING)
  const cashout = await Cashout.create({
    invoiceId,
    conversionId,
    businessId,
    nessieAccountId,
    amountCents,
    status: 'PROCESSING',
  });

  try {
    // Attempt real Nessie API call
    const result = await createNessieDeposit(nessieAccountId, amountCents, description);

    // Success - update cashout with real transfer ID
    cashout.nessieTransferId = result.transferId;
    cashout.status = 'COMPLETED';
    cashout.completedAt = new Date();
    await cashout.save();

    return cashout;
  } catch (error) {
    // API failed - simulate success for demo resilience
    console.warn(`Nessie API failed, simulating success: ${error.message}`);

    const simulatedTransferId = generateSimulatedTransferId();
    cashout.nessieTransferId = simulatedTransferId;
    cashout.status = 'COMPLETED';
    cashout.completedAt = new Date();
    cashout.errorMessage = `Simulated (API error: ${error.message})`;
    await cashout.save();

    return cashout;
  }
}

/**
 * Create a deposit in Nessie account
 * Internal function that makes the actual API call
 *
 * @param {string} accountId - Nessie account ID
 * @param {number} amountCents - Amount in USD cents
 * @param {string} description - Transaction description
 * @returns {Promise<{ transferId: string }>}
 */
async function createNessieDeposit(accountId, amountCents, description) {
  const apiKey = config.nessieApiKey;
  if (!apiKey) {
    throw new Error('NESSIE_API_KEY not configured');
  }

  const amountDollars = amountCents / 100;
  const transactionDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const url = `${NESSIE_BASE_URL}/accounts/${accountId}/deposits?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      medium: 'balance',
      transaction_date: transactionDate,
      amount: amountDollars,
      description: description,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nessie API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  return {
    transferId: data.objectCreated?._id || data._id || generateSimulatedTransferId(),
  };
}

// ========== CUSTOMER OPERATIONS ==========

/**
 * Create a new Nessie customer
 * Required before creating an account
 *
 * @param {object} customerData
 * @param {string} customerData.firstName - Customer first name
 * @param {string} customerData.lastName - Customer last name
 * @param {object} customerData.address - Address object
 * @returns {Promise<object>} - Created customer
 */
async function createCustomer(customerData) {
  const apiKey = config.nessieApiKey;
  if (!apiKey) {
    throw new Error('NESSIE_API_KEY not configured');
  }

  const url = `${NESSIE_BASE_URL}/customers?key=${apiKey}`;

  const payload = {
    first_name: customerData.firstName,
    last_name: customerData.lastName,
    address: {
      street_number: customerData.address?.streetNumber || '1',
      street_name: customerData.address?.streetName || 'Main St',
      city: customerData.address?.city || 'Boston',
      state: customerData.address?.state || 'MA',
      zip: customerData.address?.zip || '02101',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nessie API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.objectCreated || data;
}

/**
 * Get customer by ID
 *
 * @param {string} customerId - Nessie customer ID
 * @returns {Promise<object>} - Customer details
 */
async function getCustomer(customerId) {
  const apiKey = config.nessieApiKey;
  if (!apiKey) {
    throw new Error('NESSIE_API_KEY not configured');
  }

  const url = `${NESSIE_BASE_URL}/customers/${customerId}?key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nessie API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Get customer that owns an account
 *
 * @param {string} accountId - Nessie account ID
 * @returns {Promise<object>} - Customer details
 */
async function getCustomerByAccount(accountId) {
  const apiKey = config.nessieApiKey;
  if (!apiKey) {
    throw new Error('NESSIE_API_KEY not configured');
  }

  const url = `${NESSIE_BASE_URL}/accounts/${accountId}/customer?key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nessie API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Get all customers (for account discovery)
 *
 * @returns {Promise<object[]>} - List of customers
 */
async function listCustomers() {
  const apiKey = config.nessieApiKey;
  if (!apiKey) {
    throw new Error('NESSIE_API_KEY not configured');
  }

  const url = `${NESSIE_BASE_URL}/customers?key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    return [];
  }

  return response.json();
}

// ========== ACCOUNT OPERATIONS ==========

/**
 * Create a new Nessie account for a customer
 *
 * @param {string} customerId - Nessie customer ID
 * @param {object} accountData
 * @param {string} accountData.type - Account type (Checking, Savings, Credit Card)
 * @param {string} accountData.nickname - Account nickname
 * @param {number} accountData.balance - Initial balance (default 0)
 * @returns {Promise<object>} - Created account
 */
async function createAccount(customerId, accountData = {}) {
  const apiKey = config.nessieApiKey;
  if (!apiKey) {
    throw new Error('NESSIE_API_KEY not configured');
  }

  const url = `${NESSIE_BASE_URL}/customers/${customerId}/accounts?key=${apiKey}`;

  const payload = {
    type: accountData.type || 'Checking',
    nickname: accountData.nickname || 'Nova Payout Account',
    rewards: accountData.rewards || 0,
    balance: accountData.balance || 0,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nessie API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.objectCreated || data;
}

/**
 * Get all accounts for a customer
 *
 * @param {string} customerId - Nessie customer ID
 * @returns {Promise<object[]>} - List of accounts
 */
async function getCustomerAccounts(customerId) {
  const apiKey = config.nessieApiKey;
  if (!apiKey) {
    throw new Error('NESSIE_API_KEY not configured');
  }

  const url = `${NESSIE_BASE_URL}/customers/${customerId}/accounts?key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    return [];
  }

  return response.json();
}

/**
 * Get all accounts (for discovery)
 *
 * @returns {Promise<object[]>} - List of all accounts
 */
async function listAccounts() {
  const apiKey = config.nessieApiKey;
  if (!apiKey) {
    throw new Error('NESSIE_API_KEY not configured');
  }

  const url = `${NESSIE_BASE_URL}/accounts?key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    return [];
  }

  return response.json();
}

/**
 * Get Nessie account details
 *
 * @param {string} accountId - Nessie account ID
 * @returns {Promise<object>} - Account details
 */
async function getAccount(accountId) {
  const apiKey = config.nessieApiKey;
  if (!apiKey) {
    throw new Error('NESSIE_API_KEY not configured');
  }

  const url = `${NESSIE_BASE_URL}/accounts/${accountId}?key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nessie API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Verify that a Nessie account exists and is valid
 * Simulated accounts are always considered valid for demo resilience
 *
 * @param {string} accountId - Nessie account ID
 * @returns {Promise<boolean>}
 */
async function verifyAccount(accountId) {
  // Simulated accounts are always valid in demo mode
  if (isSimulatedAccount(accountId)) {
    return true;
  }

  try {
    await getAccount(accountId);
    return true;
  } catch (error) {
    console.warn(`Nessie account verification failed: ${error.message}`);
    return false;
  }
}

/**
 * Get deposits (transaction history) for an account
 *
 * @param {string} accountId - Nessie account ID
 * @returns {Promise<object[]>}
 */
async function getDeposits(accountId) {
  const apiKey = config.nessieApiKey;
  if (!apiKey) {
    throw new Error('NESSIE_API_KEY not configured');
  }

  const url = `${NESSIE_BASE_URL}/accounts/${accountId}/deposits?key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nessie API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Get withdrawals for an account
 *
 * @param {string} accountId - Nessie account ID
 * @returns {Promise<object[]>}
 */
async function getWithdrawals(accountId) {
  const apiKey = config.nessieApiKey;
  if (!apiKey) {
    throw new Error('NESSIE_API_KEY not configured');
  }

  const url = `${NESSIE_BASE_URL}/accounts/${accountId}/withdrawals?key=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Return empty array if no withdrawals or endpoint not supported
      return [];
    }

    return response.json();
  } catch (error) {
    console.warn(`Failed to get withdrawals: ${error.message}`);
    return [];
  }
}

/**
 * Get transfers for an account
 *
 * @param {string} accountId - Nessie account ID
 * @returns {Promise<object[]>}
 */
async function getTransfers(accountId) {
  const apiKey = config.nessieApiKey;
  if (!apiKey) {
    throw new Error('NESSIE_API_KEY not configured');
  }

  const url = `${NESSIE_BASE_URL}/accounts/${accountId}/transfers?key=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Return empty array if no transfers or endpoint not supported
      return [];
    }

    return response.json();
  } catch (error) {
    console.warn(`Failed to get transfers: ${error.message}`);
    return [];
  }
}

/**
 * Get purchases for an account
 *
 * @param {string} accountId - Nessie account ID
 * @returns {Promise<object[]>}
 */
async function getPurchases(accountId) {
  const apiKey = config.nessieApiKey;
  if (!apiKey) {
    throw new Error('NESSIE_API_KEY not configured');
  }

  const url = `${NESSIE_BASE_URL}/accounts/${accountId}/purchases?key=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Return empty array if no purchases or endpoint not supported
      return [];
    }

    return response.json();
  } catch (error) {
    console.warn(`Failed to get purchases: ${error.message}`);
    return [];
  }
}

/**
 * Get all transactions for an account (deposits, withdrawals, transfers, purchases)
 * Combined and sorted by date
 *
 * @param {string} accountId - Nessie account ID
 * @param {object} options - Query options
 * @returns {Promise<object[]>}
 */
async function getAllTransactions(accountId, options = {}) {
  const { limit = 50 } = options;

  try {
    // Fetch all transaction types in parallel
    const [deposits, withdrawals, transfers, purchases] = await Promise.all([
      getDeposits(accountId).catch(() => []),
      getWithdrawals(accountId).catch(() => []),
      getTransfers(accountId).catch(() => []),
      getPurchases(accountId).catch(() => []),
    ]);

    // Normalize and combine transactions
    const transactions = [
      ...deposits.map((d) => ({
        id: d._id,
        type: 'deposit',
        amount: d.amount,
        description: d.description || 'Deposit',
        status: d.status || 'completed',
        date: d.transaction_date || d.created_at,
        medium: d.medium,
        raw: d,
      })),
      ...withdrawals.map((w) => ({
        id: w._id,
        type: 'withdrawal',
        amount: -w.amount, // Negative for withdrawals
        description: w.description || 'Withdrawal',
        status: w.status || 'completed',
        date: w.transaction_date || w.created_at,
        medium: w.medium,
        raw: w,
      })),
      ...transfers.map((t) => ({
        id: t._id,
        type: 'transfer',
        amount: t.payer_id === accountId ? -t.amount : t.amount,
        description: t.description || 'Transfer',
        status: t.status || 'completed',
        date: t.transaction_date || t.created_at,
        payerId: t.payer_id,
        payeeId: t.payee_id,
        raw: t,
      })),
      ...purchases.map((p) => ({
        id: p._id,
        type: 'purchase',
        amount: -p.amount, // Negative for purchases (money spent)
        description: p.description || 'Purchase',
        status: p.status || 'completed',
        date: p.purchase_date || p.created_at,
        merchantId: p.merchant_id,
        raw: p,
      })),
    ];

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Limit results
    return transactions.slice(0, limit);
  } catch (error) {
    console.error(`Failed to get all transactions: ${error.message}`);
    throw error;
  }
}

/**
 * Get a single deposit by ID
 *
 * @param {string} depositId - Deposit ID
 * @returns {Promise<object>}
 */
async function getDeposit(depositId) {
  const apiKey = config.nessieApiKey;
  if (!apiKey) {
    throw new Error('NESSIE_API_KEY not configured');
  }

  const url = `${NESSIE_BASE_URL}/deposits/${depositId}?key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nessie API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Get account balance
 *
 * @param {string} accountId - Nessie account ID
 * @returns {Promise<number>} - Balance in dollars
 */
async function getAccountBalance(accountId) {
  const account = await getAccount(accountId);
  return account.balance || 0;
}

// ========== QUERIES ==========

/**
 * Get cashout by invoice ID
 *
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Cashout|null>}
 */
async function getCashoutByInvoice(invoiceId) {
  return Cashout.findOne({ invoiceId }).sort({ createdAt: -1 });
}

/**
 * Get all cashouts for a business
 *
 * @param {string} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<Cashout[]>}
 */
async function getCashoutsByBusiness(businessId, options = {}) {
  const { limit = 50, status } = options;

  const query = { businessId };
  if (status) {
    query.status = status;
  }

  return Cashout.find(query).sort({ createdAt: -1 }).limit(limit);
}

/**
 * Get cashout statistics for a business
 *
 * @param {string} businessId - Business ID
 * @returns {Promise<object>}
 */
async function getCashoutStats(businessId) {
  const cashouts = await Cashout.find({
    businessId,
    status: 'COMPLETED',
  });

  return {
    totalCount: cashouts.length,
    totalCents: cashouts.reduce((sum, c) => sum + c.amountCents, 0),
    formattedTotal: `$${(cashouts.reduce((sum, c) => sum + c.amountCents, 0) / 100).toFixed(2)}`,
  };
}

// ========== UTILITIES ==========

/**
 * Generate a simulated Nessie transfer ID
 * Used when real API fails
 *
 * @returns {string}
 */
function generateSimulatedTransferId() {
  return 'sim_nessie_' + crypto.randomBytes(12).toString('hex');
}

/**
 * Check if a transfer ID is simulated
 *
 * @param {string} transferId
 * @returns {boolean}
 */
function isSimulatedTransfer(transferId) {
  return transferId && transferId.startsWith('sim_nessie_');
}

/**
 * Check if an account ID is simulated
 *
 * @param {string} accountId
 * @returns {boolean}
 */
function isSimulatedAccount(accountId) {
  return accountId && accountId.startsWith('sim_acct_');
}

/**
 * Check if a customer ID is simulated
 *
 * @param {string} customerId
 * @returns {boolean}
 */
function isSimulatedCustomer(customerId) {
  return customerId && customerId.startsWith('sim_cust_');
}

/**
 * Get simulated account details for demo mode
 * Note: Balance is set to 0 here - actual balance comes from getCashoutStats()
 *
 * @param {string} accountId - Simulated account ID
 * @returns {object} - Mock account details
 */
function getSimulatedAccountDetails(accountId) {
  return {
    _id: accountId,
    type: 'Checking',
    nickname: 'Nova Payout Account (Demo)',
    balance: 0, // Real balance calculated from cashouts via /nessie/balance endpoint
    rewards: 0,
    simulated: true,
  };
}

/**
 * Get simulated customer details for demo mode
 *
 * @param {string} customerId - Simulated customer ID
 * @param {string} businessName - Business name to derive customer name
 * @returns {object} - Mock customer details
 */
function getSimulatedCustomerDetails(customerId, businessName = 'Nova Business') {
  const nameParts = businessName.split(' ');
  const firstName = nameParts[0] || 'Nova';
  const lastName = nameParts.slice(1).join(' ') || 'Business';

  return {
    _id: customerId,
    first_name: firstName,
    last_name: lastName,
    address: {
      street_number: '1',
      street_name: 'Main St',
      city: 'Boston',
      state: 'MA',
      zip: '02101',
    },
    simulated: true,
  };
}

/**
 * Format cashout amount for display
 *
 * @param {number} amountCents
 * @returns {string}
 */
function formatCashoutAmount(amountCents) {
  return `$${(amountCents / 100).toFixed(2)}`;
}

module.exports = {
  // Constants
  NESSIE_BASE_URL,

  // Cashout execution
  executeCashout,
  createNessieDeposit,

  // Customer operations
  createCustomer,
  getCustomer,
  getCustomerByAccount,
  listCustomers,

  // Account operations
  createAccount,
  getAccount,
  getCustomerAccounts,
  listAccounts,
  verifyAccount,
  getAccountBalance,

  // Transaction operations
  getDeposits,
  getDeposit,
  getWithdrawals,
  getTransfers,
  getPurchases,
  getAllTransactions,

  // Queries
  getCashoutByInvoice,
  getCashoutsByBusiness,
  getCashoutStats,

  // Utilities
  generateSimulatedTransferId,
  isSimulatedTransfer,
  isSimulatedAccount,
  isSimulatedCustomer,
  getSimulatedAccountDetails,
  getSimulatedCustomerDetails,
  formatCashoutAmount,
};
