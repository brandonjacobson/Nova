/**
 * Unified Chain Service
 *
 * Provides a consistent interface for all blockchain operations across BTC, ETH, and SOL.
 * Abstracts the differences between deposit address (BTC/ETH) and Solana Pay (SOL) models.
 */

const bitcoin = require('./bitcoin');
const ethereum = require('./ethereum');
const solana = require('./solana');

// ========== CONSTANTS ==========

const SUPPORTED_CHAINS = ['BTC', 'ETH', 'SOL'];

// ========== EXCHANGE RATES ==========

/**
 * Get current demo exchange rates for all supported chains
 * In production: Would fetch from price API (CoinGecko, etc.)
 *
 * @returns {{ btc: number, eth: number, sol: number }}
 */
function getRates() {
  return {
    btc: bitcoin.BTC_USD_RATE,
    eth: ethereum.ETH_USD_RATE,
    sol: solana.SOL_USD_RATE,
  };
}

/**
 * Get rate for specific chain
 * @param {'BTC'|'ETH'|'SOL'} chain
 * @returns {number} - USD price per unit
 */
function getRate(chain) {
  const rates = getRates();
  return rates[chain.toLowerCase()];
}

// ========== ADDRESS GENERATION ==========

/**
 * Generate deposit address for specified chain
 *
 * For BTC/ETH: Returns { address, privateKey }
 * For SOL: Returns { address, reference } (Solana Pay model)
 *
 * @param {'BTC'|'ETH'|'SOL'} chain
 * @param {object} options - Chain-specific options
 * @param {string} options.recipientAddress - Required for SOL (merchant's wallet)
 * @returns {object} - Chain-specific deposit details
 */
function generateDepositAddress(chain, options = {}) {
  switch (chain.toUpperCase()) {
    case 'BTC':
      return bitcoin.generateDepositAddress();

    case 'ETH':
      return ethereum.generateDepositAddress();

    case 'SOL':
      if (!options.recipientAddress) {
        throw new Error('recipientAddress required for Solana deposit address');
      }
      return solana.generateDepositAddress(options.recipientAddress);

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

// ========== PAYMENT VERIFICATION ==========

/**
 * Check if payment received on specified chain
 *
 * @param {'BTC'|'ETH'|'SOL'} chain
 * @param {string} addressOrReference - Deposit address (BTC/ETH) or reference (SOL)
 * @param {string} expectedAmount - Expected amount in native units (satoshis/wei/lamports)
 * @returns {Promise<{ found: boolean, txHash?: string, amount?: string, confirmations?: number }>}
 */
async function checkPayment(chain, addressOrReference, expectedAmount) {
  switch (chain.toUpperCase()) {
    case 'BTC':
      return bitcoin.checkPayment(addressOrReference, expectedAmount);

    case 'ETH':
      return ethereum.checkPayment(addressOrReference, expectedAmount);

    case 'SOL':
      // For Solana, use the simulation-aware check
      const result = await solana.checkPaymentWithSimulation(addressOrReference);
      if (result.found) {
        return {
          found: true,
          txHash: result.signature,
          amount: result.amount,
          confirmations: 1,
        };
      }
      return { found: false };

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

/**
 * Simulate a payment for demo purposes
 *
 * @param {'BTC'|'ETH'|'SOL'} chain
 * @param {string} addressOrReference
 * @param {string} amount - Amount in native units
 * @returns {{ txHash: string }}
 */
function simulatePayment(chain, addressOrReference, amount) {
  switch (chain.toUpperCase()) {
    case 'BTC':
      return bitcoin.simulatePayment(addressOrReference, amount);

    case 'ETH':
      return ethereum.simulatePayment(addressOrReference, amount);

    case 'SOL':
      return solana.simulatePayment(addressOrReference, amount);

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

/**
 * Clear simulated payment (for testing)
 * @param {'BTC'|'ETH'|'SOL'} chain
 * @param {string} addressOrReference
 */
function clearSimulatedPayment(chain, addressOrReference) {
  switch (chain.toUpperCase()) {
    case 'BTC':
      return bitcoin.clearSimulatedPayment(addressOrReference);

    case 'ETH':
      return ethereum.clearSimulatedPayment(addressOrReference);

    case 'SOL':
      return solana.clearSimulatedPayment(addressOrReference);

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

// ========== CONVERSION HELPERS ==========

/**
 * Convert USD cents to chain native amount
 *
 * @param {'BTC'|'ETH'|'SOL'} chain
 * @param {number} usdCents
 * @returns {string} - Amount in native units (satoshis, wei, lamports)
 */
function usdToChainAmount(chain, usdCents) {
  switch (chain.toUpperCase()) {
    case 'BTC':
      return bitcoin.usdToSatoshis(usdCents);

    case 'ETH':
      return ethereum.usdToWei(usdCents);

    case 'SOL':
      return solana.usdToLamports(usdCents);

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

/**
 * Convert chain native amount to USD cents
 *
 * @param {'BTC'|'ETH'|'SOL'} chain
 * @param {string} amount - Native units
 * @returns {number} - USD cents
 */
function chainAmountToUsd(chain, amount) {
  switch (chain.toUpperCase()) {
    case 'BTC':
      return bitcoin.satoshisToUsd(amount);

    case 'ETH':
      return ethereum.weiToUsd(amount);

    case 'SOL':
      return solana.lamportsToUsd(amount);

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

/**
 * Calculate payment amounts for all chains from USD total
 *
 * @param {number} totalUsdCents - Invoice total in USD cents
 * @returns {{ btc: string, eth: string, sol: string }} - Amounts in native units
 */
function calculatePaymentAmounts(totalUsdCents) {
  return {
    btc: usdToChainAmount('BTC', totalUsdCents),
    eth: usdToChainAmount('ETH', totalUsdCents),
    sol: usdToChainAmount('SOL', totalUsdCents),
  };
}

/**
 * Format native amount as human-readable string
 *
 * @param {'BTC'|'ETH'|'SOL'} chain
 * @param {string} amount - Native units
 * @returns {string} - e.g., "0.00016667 BTC"
 */
function formatAmount(chain, amount) {
  switch (chain.toUpperCase()) {
    case 'BTC':
      return bitcoin.formatAmount(amount);

    case 'ETH':
      return ethereum.formatAmount(amount);

    case 'SOL':
      return solana.formatAmount(amount);

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

/**
 * Format all payment amounts as human-readable
 *
 * @param {number} totalUsdCents
 * @returns {{ btc: string, eth: string, sol: string }}
 */
function formatPaymentAmounts(totalUsdCents) {
  const amounts = calculatePaymentAmounts(totalUsdCents);
  return {
    btc: formatAmount('BTC', amounts.btc),
    eth: formatAmount('ETH', amounts.eth),
    sol: formatAmount('SOL', amounts.sol),
  };
}

// ========== EXPLORER ==========

/**
 * Get blockchain explorer URL for transaction
 *
 * @param {'BTC'|'ETH'|'SOL'} chain
 * @param {string} txHash
 * @returns {string}
 */
function getExplorerUrl(chain, txHash) {
  switch (chain.toUpperCase()) {
    case 'BTC':
      return bitcoin.getExplorerUrl(txHash);

    case 'ETH':
      return ethereum.getExplorerUrl(txHash);

    case 'SOL':
      return solana.getExplorerUrl(txHash);

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

/**
 * Get blockchain explorer URL for address
 *
 * @param {'BTC'|'ETH'|'SOL'} chain
 * @param {string} address
 * @returns {string}
 */
function getAddressExplorerUrl(chain, address) {
  switch (chain.toUpperCase()) {
    case 'BTC':
      return bitcoin.getAddressExplorerUrl(address);

    case 'ETH':
      return ethereum.getAddressExplorerUrl(address);

    case 'SOL':
      return solana.getAddressExplorerUrl(address);

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

// ========== VALIDATION ==========

/**
 * Validate address format for specified chain
 *
 * @param {'BTC'|'ETH'|'SOL'} chain
 * @param {string} address
 * @returns {boolean}
 */
function isValidAddress(chain, address) {
  switch (chain.toUpperCase()) {
    case 'BTC':
      return bitcoin.isValidAddress(address);

    case 'ETH':
      return ethereum.isValidAddress(address);

    case 'SOL':
      return solana.isValidAddress(address);

    default:
      return false;
  }
}

/**
 * Check if chain is supported
 *
 * @param {string} chain
 * @returns {boolean}
 */
function isSupportedChain(chain) {
  return SUPPORTED_CHAINS.includes(chain?.toUpperCase());
}

// ========== UNIT CONVERSIONS ==========

/**
 * Get the smallest unit name for a chain
 * @param {'BTC'|'ETH'|'SOL'} chain
 * @returns {string}
 */
function getSmallestUnitName(chain) {
  switch (chain.toUpperCase()) {
    case 'BTC':
      return 'satoshis';
    case 'ETH':
      return 'wei';
    case 'SOL':
      return 'lamports';
    default:
      return 'units';
  }
}

/**
 * Get the conversion factor (smallest units per 1 whole coin)
 * @param {'BTC'|'ETH'|'SOL'} chain
 * @returns {bigint|number}
 */
function getSmallestUnitFactor(chain) {
  switch (chain.toUpperCase()) {
    case 'BTC':
      return bitcoin.SATOSHIS_PER_BTC;
    case 'ETH':
      return ethereum.WEI_PER_ETH;
    case 'SOL':
      return solana.LAMPORTS_PER_SOL;
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

module.exports = {
  // Constants
  SUPPORTED_CHAINS,

  // Exchange rates
  getRates,
  getRate,

  // Address generation
  generateDepositAddress,

  // Payment verification
  checkPayment,
  simulatePayment,
  clearSimulatedPayment,

  // Conversion helpers
  usdToChainAmount,
  chainAmountToUsd,
  calculatePaymentAmounts,
  formatAmount,
  formatPaymentAmounts,

  // Explorer
  getExplorerUrl,
  getAddressExplorerUrl,

  // Validation
  isValidAddress,
  isSupportedChain,

  // Unit info
  getSmallestUnitName,
  getSmallestUnitFactor,

  // Direct access to chain services (for advanced use)
  bitcoin,
  ethereum,
  solana,
};
