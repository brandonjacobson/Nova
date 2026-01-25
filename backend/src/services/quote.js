/**
 * Quote Service
 *
 * Locks exchange rates for invoices and calculates payment amounts.
 * Quotes expire after QUOTE_EXPIRY_MINUTES to protect against price volatility.
 */

const Invoice = require('../models/Invoice');
const chains = require('./chains');

// ========== CONSTANTS ==========

// Quote expires after 15 minutes
const QUOTE_EXPIRY_MINUTES = 15;

// ========== QUOTE MANAGEMENT ==========

/**
 * Create a locked quote for an invoice
 * Captures current exchange rates and sets expiration
 *
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<object>} - Quote object with rates, lockedAt, expiresAt
 */
async function createQuote(invoiceId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  const rates = chains.getRates();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + QUOTE_EXPIRY_MINUTES * 60 * 1000);

  // Store the quote in the invoice
  invoice.lockedQuote = {
    rates: {
      btc: rates.btc,
      eth: rates.eth,
      sol: rates.sol,
    },
    lockedAt: now,
    expiresAt: expiresAt,
  };

  await invoice.save();

  return {
    rates: invoice.lockedQuote.rates,
    lockedAt: invoice.lockedQuote.lockedAt,
    expiresAt: invoice.lockedQuote.expiresAt,
  };
}

/**
 * Get current quote for invoice
 * Returns existing valid quote or creates new one
 *
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<object>} - Quote object
 */
async function getQuote(invoiceId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  // Check if existing quote is still valid
  if (invoice.lockedQuote?.expiresAt && isQuoteValid(invoice.lockedQuote)) {
    return {
      rates: invoice.lockedQuote.rates,
      lockedAt: invoice.lockedQuote.lockedAt,
      expiresAt: invoice.lockedQuote.expiresAt,
    };
  }

  // Create new quote if none exists or expired
  return createQuote(invoiceId);
}

/**
 * Check if a quote is still valid (not expired)
 *
 * @param {object} quote - Quote object with expiresAt
 * @returns {boolean} - True if quote is valid
 */
function isQuoteValid(quote) {
  if (!quote || !quote.expiresAt) {
    return false;
  }
  return new Date() < new Date(quote.expiresAt);
}

/**
 * Get remaining time on quote in seconds
 *
 * @param {object} quote - Quote object with expiresAt
 * @returns {number} - Seconds remaining, 0 if expired
 */
function getQuoteTimeRemaining(quote) {
  if (!quote || !quote.expiresAt) {
    return 0;
  }
  const remaining = new Date(quote.expiresAt) - new Date();
  return Math.max(0, Math.floor(remaining / 1000));
}

// ========== PAYMENT CALCULATIONS ==========

/**
 * Calculate payment amounts for all chains from USD total
 * Uses provided rates or fetches current rates
 *
 * @param {number} totalUsdCents - Invoice total in USD cents
 * @param {object} rates - Exchange rates { btc, eth, sol }
 * @returns {{ btc: string, eth: string, sol: string }} - Amounts in native units
 */
function calculatePaymentAmounts(totalUsdCents, rates) {
  const effectiveRates = rates || chains.getRates();

  return {
    btc: chains.usdToChainAmount('BTC', totalUsdCents),
    eth: chains.usdToChainAmount('ETH', totalUsdCents),
    sol: chains.usdToChainAmount('SOL', totalUsdCents),
  };
}

/**
 * Calculate formatted payment amounts (human-readable)
 *
 * @param {number} totalUsdCents - Invoice total in USD cents
 * @param {object} rates - Exchange rates { btc, eth, sol }
 * @returns {{ btc: string, eth: string, sol: string }} - Formatted amounts
 */
function calculateFormattedAmounts(totalUsdCents, rates) {
  const amounts = calculatePaymentAmounts(totalUsdCents, rates);

  return {
    btc: chains.formatAmount('BTC', amounts.btc),
    eth: chains.formatAmount('ETH', amounts.eth),
    sol: chains.formatAmount('SOL', amounts.sol),
  };
}

/**
 * Get full payment info for an invoice including amounts and quote
 *
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<object>} - Payment info with amounts and quote
 */
async function getPaymentInfo(invoiceId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  // Get or create quote
  const quote = await getQuote(invoiceId);

  // Calculate payment amounts using locked rates
  const amounts = calculatePaymentAmounts(invoice.total, quote.rates);
  const formattedAmounts = calculateFormattedAmounts(invoice.total, quote.rates);

  return {
    invoiceId: invoice._id,
    totalUsdCents: invoice.total,
    formattedTotal: invoice.formattedTotal,
    paymentOptions: invoice.paymentOptions,
    depositAddresses: invoice.depositAddresses,
    amounts,
    formattedAmounts,
    quote: {
      rates: quote.rates,
      lockedAt: quote.lockedAt,
      expiresAt: quote.expiresAt,
      isValid: isQuoteValid(quote),
      secondsRemaining: getQuoteTimeRemaining(quote),
    },
  };
}

/**
 * Refresh quote if expired
 *
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<object>} - Fresh quote
 */
async function refreshQuoteIfExpired(invoiceId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  if (!isQuoteValid(invoice.lockedQuote)) {
    return createQuote(invoiceId);
  }

  return {
    rates: invoice.lockedQuote.rates,
    lockedAt: invoice.lockedQuote.lockedAt,
    expiresAt: invoice.lockedQuote.expiresAt,
  };
}

module.exports = {
  // Constants
  QUOTE_EXPIRY_MINUTES,

  // Quote management
  createQuote,
  getQuote,
  isQuoteValid,
  getQuoteTimeRemaining,
  refreshQuoteIfExpired,

  // Payment calculations
  calculatePaymentAmounts,
  calculateFormattedAmounts,
  getPaymentInfo,
};
