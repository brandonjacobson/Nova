/**
 * Bitcoin Service
 *
 * Simulated Bitcoin testnet integration for hackathon demo.
 * In production, this would use bitcoinjs-lib and BlockCypher API.
 */

const crypto = require('crypto');

// ========== CONSTANTS ==========

// Demo exchange rate (1 BTC = $60,000 USD)
const BTC_USD_RATE = 60000;

// 1 BTC = 100,000,000 satoshis
const SATOSHIS_PER_BTC = 100_000_000;

// In-memory store for simulated payments (for demo purposes)
const simulatedPayments = new Map();

// ========== ADDRESS GENERATION ==========

/**
 * Generate a simulated Bitcoin testnet address
 * In production: Would use bitcoinjs-lib with HD wallet derivation
 *
 * @returns {{ address: string, privateKey: string }}
 */
function generateDepositAddress() {
  // Generate random bytes for simulated keys
  const privateKeyBytes = crypto.randomBytes(32);
  const privateKey = privateKeyBytes.toString('hex');

  // Generate a testnet-style address (starts with 'm' or 'n' for testnet P2PKH)
  // This is just for visual authenticity - not cryptographically derived
  const addressBytes = crypto.randomBytes(20);
  const addressHash = addressBytes.toString('hex').slice(0, 33);
  const address = 'm' + addressHash; // Testnet P2PKH format

  return {
    address,
    privateKey,
  };
}

// ========== PAYMENT VERIFICATION ==========

/**
 * Check if payment received at address (simulated)
 * In production: Would call BlockCypher API
 *
 * @param {string} address - Bitcoin address
 * @param {string} expectedSatoshis - Expected amount in satoshis
 * @returns {{ found: boolean, txHash?: string, amount?: string, confirmations?: number }}
 */
async function checkPayment(address, expectedSatoshis) {
  // Check simulated payments store
  const payment = simulatedPayments.get(address);

  if (payment) {
    return {
      found: true,
      txHash: payment.txHash,
      amount: payment.amount,
      confirmations: payment.confirmations || 1,
    };
  }

  return {
    found: false,
  };
}

/**
 * Simulate a payment being received (for demo purposes)
 * Call this to "detect" a payment during demos
 *
 * @param {string} address - Bitcoin address that received payment
 * @param {string} amount - Amount in satoshis
 * @returns {{ txHash: string }}
 */
function simulatePayment(address, amount) {
  const txHash = generateSimulatedTxHash();

  simulatedPayments.set(address, {
    txHash,
    amount,
    confirmations: 1,
    detectedAt: new Date(),
  });

  return { txHash };
}

/**
 * Clear a simulated payment (for testing)
 * @param {string} address
 */
function clearSimulatedPayment(address) {
  simulatedPayments.delete(address);
}

// ========== CONVERSION HELPERS ==========

/**
 * Convert USD cents to satoshis
 * @param {number} usdCents
 * @returns {string} - Satoshis as string for precision
 */
function usdToSatoshis(usdCents) {
  const usdAmount = usdCents / 100;
  const btcAmount = usdAmount / BTC_USD_RATE;
  const satoshis = Math.ceil(btcAmount * SATOSHIS_PER_BTC);
  return String(satoshis);
}

/**
 * Convert satoshis to USD cents
 * @param {string} satoshis
 * @returns {number} - USD cents
 */
function satoshisToUsd(satoshis) {
  const btcAmount = Number(satoshis) / SATOSHIS_PER_BTC;
  const usdAmount = btcAmount * BTC_USD_RATE;
  return Math.round(usdAmount * 100);
}

/**
 * Format satoshis as human-readable BTC
 * @param {string} satoshis
 * @returns {string} - e.g., "0.00016667 BTC"
 */
function formatAmount(satoshis) {
  const btcAmount = Number(satoshis) / SATOSHIS_PER_BTC;
  return btcAmount.toFixed(8) + ' BTC';
}

// ========== EXPLORER ==========

/**
 * Get BlockCypher testnet explorer URL for transaction
 * @param {string} txHash
 * @returns {string}
 */
function getExplorerUrl(txHash) {
  return `https://live.blockcypher.com/btc-testnet/tx/${txHash}/`;
}

/**
 * Get BlockCypher testnet explorer URL for address
 * @param {string} address
 * @returns {string}
 */
function getAddressExplorerUrl(address) {
  return `https://live.blockcypher.com/btc-testnet/address/${address}/`;
}

// ========== UTILITIES ==========

/**
 * Generate a simulated transaction hash
 * Looks like a real Bitcoin txid (64 hex chars)
 * @returns {string}
 */
function generateSimulatedTxHash() {
  return 'sim_btc_' + crypto.randomBytes(28).toString('hex');
}

/**
 * Validate Bitcoin address format (basic check)
 * @param {string} address
 * @returns {boolean}
 */
function isValidAddress(address) {
  // Basic validation: testnet addresses start with 'm', 'n', '2', or 'tb1'
  // Mainnet addresses start with '1', '3', or 'bc1'
  if (!address || typeof address !== 'string') return false;

  // Testnet P2PKH (legacy)
  if (address.startsWith('m') || address.startsWith('n')) {
    return address.length >= 26 && address.length <= 35;
  }

  // Testnet P2SH
  if (address.startsWith('2')) {
    return address.length >= 26 && address.length <= 35;
  }

  // Testnet Bech32 (SegWit)
  if (address.startsWith('tb1')) {
    return address.length >= 42 && address.length <= 62;
  }

  // Mainnet addresses (for payout address validation)
  if (address.startsWith('1') || address.startsWith('3')) {
    return address.length >= 26 && address.length <= 35;
  }

  // Mainnet Bech32
  if (address.startsWith('bc1')) {
    return address.length >= 42 && address.length <= 62;
  }

  return false;
}

module.exports = {
  // Constants
  BTC_USD_RATE,
  SATOSHIS_PER_BTC,

  // Address generation
  generateDepositAddress,

  // Payment verification
  checkPayment,
  simulatePayment,
  clearSimulatedPayment,

  // Conversion helpers
  usdToSatoshis,
  satoshisToUsd,
  formatAmount,

  // Explorer
  getExplorerUrl,
  getAddressExplorerUrl,

  // Utilities
  generateSimulatedTxHash,
  isValidAddress,
};
