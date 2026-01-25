/**
 * Settlement Engine
 *
 * Handles transferring funds to merchant's payout address.
 * For demo: Simulated transfers with generated transaction hashes.
 * In production: Would execute real blockchain transactions.
 */

const crypto = require('crypto');
const Settlement = require('../models/Settlement');
const chains = require('./chains');

// ========== SETTLEMENT EXECUTION ==========

/**
 * Execute a settlement to merchant's payout address
 *
 * Flow:
 * 1. Create Settlement record (PENDING)
 * 2. Simulate the transfer
 * 3. Generate simulated txHash
 * 4. Mark as COMPLETED
 *
 * @param {object} params
 * @param {string} params.invoiceId - Invoice ID
 * @param {string} params.paymentId - Payment record ID (optional)
 * @param {string} params.conversionId - Conversion record ID (null for Mode B)
 * @param {string} params.businessId - Business ID
 * @param {'BTC'|'ETH'|'SOL'} params.asset - Asset being settled
 * @param {string} params.amount - Amount in native units
 * @param {string} params.toAddress - Merchant's payout address
 * @returns {Promise<Settlement>} - Settlement record
 */
async function executeSettlement({
  invoiceId,
  paymentId = null,
  conversionId = null,
  businessId,
  asset,
  amount,
  toAddress,
}) {
  // Validate inputs
  if (!toAddress) {
    throw new Error(`No payout address provided for ${asset} settlement`);
  }

  if (!chains.isValidAddress(asset, toAddress)) {
    throw new Error(`Invalid ${asset} address: ${toAddress}`);
  }

  // Calculate USD value at settlement time
  const amountUsd = chains.chainAmountToUsd(asset, amount);

  // Generate simulated transaction hash
  const txHash = generateSimulatedSettlementTxHash(asset);

  // Create settlement record (directly completed for simulation)
  const settlement = await Settlement.create({
    invoiceId,
    paymentId,
    conversionId,
    businessId,
    asset,
    amount,
    amountUsd,
    toAddress,
    txHash,
    status: 'COMPLETED',
    completedAt: new Date(),
  });

  return settlement;
}

/**
 * Get merchant's payout address for a specific asset
 *
 * @param {object} business - Business document
 * @param {'BTC'|'ETH'|'SOL'} asset - Asset type
 * @returns {string|null} - Payout address or null if not configured
 */
function getPayoutAddress(business, asset) {
  if (!business || !business.payoutAddresses) {
    return null;
  }

  const assetKey = asset.toLowerCase();
  return business.payoutAddresses[assetKey] || null;
}

/**
 * Check if merchant has configured payout address for asset
 *
 * @param {object} business - Business document
 * @param {'BTC'|'ETH'|'SOL'} asset - Asset type
 * @returns {boolean}
 */
function hasPayoutAddress(business, asset) {
  const address = getPayoutAddress(business, asset);
  return Boolean(address && address.length > 0);
}

/**
 * Validate that all required payout addresses are configured
 *
 * @param {object} business - Business document
 * @param {string[]} assets - List of assets to check
 * @returns {{ valid: boolean, missing: string[] }}
 */
function validatePayoutAddresses(business, assets) {
  const missing = [];

  for (const asset of assets) {
    if (!hasPayoutAddress(business, asset)) {
      missing.push(asset);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

// ========== QUERIES ==========

/**
 * Get settlement by invoice ID
 *
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Settlement|null>}
 */
async function getSettlementByInvoice(invoiceId) {
  return Settlement.findOne({ invoiceId }).sort({ createdAt: -1 });
}

/**
 * Get all settlements for a business
 *
 * @param {string} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<Settlement[]>}
 */
async function getSettlementsByBusiness(businessId, options = {}) {
  const { limit = 50, status, asset } = options;

  const query = { businessId };
  if (status) query.status = status;
  if (asset) query.asset = asset;

  return Settlement.find(query).sort({ createdAt: -1 }).limit(limit);
}

/**
 * Get settlement statistics for a business
 *
 * @param {string} businessId - Business ID
 * @returns {Promise<object>}
 */
async function getSettlementStats(businessId) {
  const settlements = await Settlement.find({
    businessId,
    status: 'COMPLETED',
  });

  const stats = {
    totalCount: settlements.length,
    totalUsdCents: 0,
    byAsset: {
      BTC: { count: 0, totalUsd: 0 },
      ETH: { count: 0, totalUsd: 0 },
      SOL: { count: 0, totalUsd: 0 },
    },
  };

  for (const settlement of settlements) {
    stats.totalUsdCents += settlement.amountUsd;
    if (stats.byAsset[settlement.asset]) {
      stats.byAsset[settlement.asset].count += 1;
      stats.byAsset[settlement.asset].totalUsd += settlement.amountUsd;
    }
  }

  return stats;
}

// ========== UTILITIES ==========

/**
 * Generate a simulated settlement transaction hash
 * Format: sim_settle_{asset}_{randomHex}
 *
 * @param {'BTC'|'ETH'|'SOL'} asset
 * @returns {string}
 */
function generateSimulatedSettlementTxHash(asset) {
  const randomPart = crypto.randomBytes(28).toString('hex');
  return `sim_settle_${asset.toLowerCase()}_${randomPart}`;
}

/**
 * Get human-readable settlement description
 *
 * @param {Settlement} settlement - Settlement record
 * @returns {string}
 */
function getSettlementDescription(settlement) {
  const formatted = chains.formatAmount(settlement.asset, settlement.amount);
  const shortAddress =
    settlement.toAddress.slice(0, 8) + '...' + settlement.toAddress.slice(-6);
  return `${formatted} → ${shortAddress}`;
}

/**
 * Get explorer URL for settlement transaction
 *
 * @param {Settlement} settlement - Settlement record
 * @returns {string}
 */
function getSettlementExplorerUrl(settlement) {
  return chains.getExplorerUrl(settlement.asset, settlement.txHash);
}

module.exports = {
  // Core functions
  executeSettlement,
  getPayoutAddress,
  hasPayoutAddress,
  validatePayoutAddresses,

  // Queries
  getSettlementByInvoice,
  getSettlementsByBusiness,
  getSettlementStats,

  // Utilities
  generateSimulatedSettlementTxHash,
  getSettlementDescription,
  getSettlementExplorerUrl,
};
