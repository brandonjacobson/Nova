/**
 * Conversion Engine
 *
 * Simulated cross-chain conversion for Mode A operations.
 * In production: Would integrate with DEX/CEX APIs.
 * For demo: Instant simulated conversions using locked exchange rates.
 */

const crypto = require('crypto');
const Conversion = require('../models/Conversion');
const chains = require('./chains');

// ========== CONVERSION LOGIC ==========

/**
 * Check if conversion is needed based on payment chain and settlement target
 * Mode B (same asset) = no conversion needed
 * Mode A (different asset) = conversion needed
 *
 * @param {'BTC'|'ETH'|'SOL'} paymentChain - Chain the client paid on
 * @param {'BTC'|'ETH'|'SOL'|'USD'} settlementTarget - What the merchant wants
 * @returns {boolean} - True if conversion is needed
 */
function isConversionNeeded(paymentChain, settlementTarget) {
  // Mode B: Same asset, no conversion
  if (paymentChain === settlementTarget) {
    return false;
  }
  // Mode A: Different asset or USD, conversion needed
  return true;
}

/**
 * Execute a simulated conversion
 *
 * Flow:
 * 1. Get current exchange rates
 * 2. Calculate USD value of input amount
 * 3. Calculate output amount in target asset
 * 4. Create Conversion record
 * 5. Mark as completed with simulated txHash
 *
 * @param {object} params
 * @param {string} params.invoiceId - Invoice ID
 * @param {string} params.paymentId - Payment record ID (optional)
 * @param {string} params.businessId - Business ID
 * @param {'BTC'|'ETH'|'SOL'} params.fromAsset - Source asset
 * @param {'BTC'|'ETH'|'SOL'|'USD'} params.toAsset - Target asset
 * @param {string} params.fromAmount - Amount in native units (satoshis/wei/lamports)
 * @param {object} params.rates - Optional locked rates to use
 * @returns {Promise<Conversion>} - Conversion record
 */
async function executeConversion({
  invoiceId,
  paymentId = null,
  businessId,
  fromAsset,
  toAsset,
  fromAmount,
  rates = null,
}) {
  // Get exchange rates (use provided or fetch current)
  const effectiveRates = rates || chains.getRates();

  // Calculate USD value of input
  const fromAmountUsd = chains.chainAmountToUsd(fromAsset, fromAmount);

  // Calculate output amount
  let toAmount;
  let toAmountUsd;

  if (toAsset === 'USD') {
    // Converting to USD - output is just the USD value
    toAmount = String(fromAmountUsd); // USD cents as string
    toAmountUsd = fromAmountUsd;
  } else {
    // Converting to another crypto
    toAmount = chains.usdToChainAmount(toAsset, fromAmountUsd);
    toAmountUsd = fromAmountUsd; // USD value stays the same (minus fees in production)
  }

  // Generate simulated transaction hash
  const txHash = generateSimulatedConversionTxHash(fromAsset, toAsset);

  // Create conversion record
  const conversion = await Conversion.create({
    invoiceId,
    paymentId,
    businessId,
    fromAsset,
    toAsset,
    fromAmount,
    toAmount,
    fromAmountUsd,
    toAmountUsd,
    route: 'VIA_STABLE',
    pivotAsset: 'USD',
    rates: {
      btc: effectiveRates.btc,
      eth: effectiveRates.eth,
      sol: effectiveRates.sol,
    },
    status: 'COMPLETED',
    txHash,
    completedAt: new Date(),
  });

  return conversion;
}

/**
 * Calculate conversion output amount without executing
 * Useful for previews and quotes
 *
 * @param {'BTC'|'ETH'|'SOL'} fromAsset - Source asset
 * @param {'BTC'|'ETH'|'SOL'|'USD'} toAsset - Target asset
 * @param {string} fromAmount - Amount in native units
 * @param {object} rates - Optional locked rates
 * @returns {{ toAmount: string, toAmountUsd: number, fromAmountUsd: number }}
 */
function calculateConversion(fromAsset, toAsset, fromAmount, rates = null) {
  const effectiveRates = rates || chains.getRates();

  // Calculate USD value of input
  const fromAmountUsd = chains.chainAmountToUsd(fromAsset, fromAmount);

  // Calculate output
  let toAmount;
  let toAmountUsd;

  if (toAsset === 'USD') {
    toAmount = String(fromAmountUsd);
    toAmountUsd = fromAmountUsd;
  } else {
    toAmount = chains.usdToChainAmount(toAsset, fromAmountUsd);
    toAmountUsd = fromAmountUsd;
  }

  return {
    fromAmount,
    fromAsset,
    fromAmountUsd,
    toAmount,
    toAsset,
    toAmountUsd,
    rates: effectiveRates,
  };
}

/**
 * Get conversion by invoice ID
 *
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Conversion|null>}
 */
async function getConversionByInvoice(invoiceId) {
  return Conversion.findOne({ invoiceId }).sort({ createdAt: -1 });
}

/**
 * Get all conversions for a business
 *
 * @param {string} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<Conversion[]>}
 */
async function getConversionsByBusiness(businessId, options = {}) {
  const { limit = 50, status } = options;

  const query = { businessId };
  if (status) {
    query.status = status;
  }

  return Conversion.find(query).sort({ createdAt: -1 }).limit(limit);
}

// ========== UTILITIES ==========

/**
 * Generate a simulated conversion transaction hash
 * Format: sim_conv_{fromAsset}_{toAsset}_{randomHex}
 *
 * @param {string} fromAsset
 * @param {string} toAsset
 * @returns {string}
 */
function generateSimulatedConversionTxHash(fromAsset, toAsset) {
  const randomPart = crypto.randomBytes(24).toString('hex');
  return `sim_conv_${fromAsset.toLowerCase()}_${toAsset.toLowerCase()}_${randomPart}`;
}

/**
 * Get human-readable conversion description
 *
 * @param {Conversion} conversion - Conversion record
 * @returns {string}
 */
function getConversionDescription(conversion) {
  const fromFormatted = chains.formatAmount(conversion.fromAsset, conversion.fromAmount);

  if (conversion.toAsset === 'USD') {
    return `${fromFormatted} → $${(conversion.toAmountUsd / 100).toFixed(2)} USD`;
  }

  const toFormatted = chains.formatAmount(conversion.toAsset, conversion.toAmount);
  return `${fromFormatted} → ${toFormatted}`;
}

/**
 * Check if conversion is for USD (fiat) settlement
 *
 * @param {'BTC'|'ETH'|'SOL'|'USD'} toAsset
 * @returns {boolean}
 */
function isUsdConversion(toAsset) {
  return toAsset === 'USD';
}

module.exports = {
  // Core functions
  isConversionNeeded,
  executeConversion,
  calculateConversion,

  // Queries
  getConversionByInvoice,
  getConversionsByBusiness,

  // Utilities
  generateSimulatedConversionTxHash,
  getConversionDescription,
  isUsdConversion,
};
