/**
 * Ethereum Service
 *
 * Simulated Ethereum Sepolia testnet integration for hackathon demo.
 * In production, this would use ethers.js with Infura RPC.
 */

const crypto = require('crypto');

// ========== CONSTANTS ==========

// Demo exchange rate (1 ETH = $3,000 USD)
const ETH_USD_RATE = 3000;

// 1 ETH = 10^18 wei
const WEI_PER_ETH = BigInt('1000000000000000000'); // 1e18 as BigInt for precision

// In-memory store for simulated payments (for demo purposes)
const simulatedPayments = new Map();

// ========== ADDRESS GENERATION ==========

/**
 * Generate a simulated Ethereum address
 * In production: Would use ethers.Wallet.createRandom()
 *
 * @returns {{ address: string, privateKey: string }}
 */
function generateDepositAddress() {
  // Generate random bytes for simulated keys
  const privateKeyBytes = crypto.randomBytes(32);
  const privateKey = '0x' + privateKeyBytes.toString('hex');

  // Generate an address (40 hex chars with 0x prefix)
  // This is just for visual authenticity - not cryptographically derived
  const addressBytes = crypto.randomBytes(20);
  const address = '0x' + addressBytes.toString('hex');

  return {
    address,
    privateKey,
  };
}

// ========== PAYMENT VERIFICATION ==========

/**
 * Check if payment received at address (simulated)
 * In production: Would query Sepolia via ethers.js
 *
 * @param {string} address - Ethereum address
 * @param {string} expectedWei - Expected amount in wei
 * @returns {{ found: boolean, txHash?: string, amount?: string, confirmations?: number }}
 */
async function checkPayment(address, expectedWei) {
  // Normalize address to lowercase for lookup
  const normalizedAddress = address.toLowerCase();
  const payment = simulatedPayments.get(normalizedAddress);

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
 * @param {string} address - Ethereum address that received payment
 * @param {string} amount - Amount in wei
 * @returns {{ txHash: string }}
 */
function simulatePayment(address, amount) {
  const txHash = generateSimulatedTxHash();
  const normalizedAddress = address.toLowerCase();

  simulatedPayments.set(normalizedAddress, {
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
  simulatedPayments.delete(address.toLowerCase());
}

// ========== CONVERSION HELPERS ==========

/**
 * Convert USD cents to wei
 * @param {number} usdCents
 * @returns {string} - Wei as string for precision
 */
function usdToWei(usdCents) {
  const usdAmount = usdCents / 100;
  const ethAmount = usdAmount / ETH_USD_RATE;
  // Use BigInt for wei precision
  const wei = BigInt(Math.ceil(ethAmount * Number(WEI_PER_ETH)));
  return wei.toString();
}

/**
 * Convert wei to USD cents
 * @param {string} wei
 * @returns {number} - USD cents
 */
function weiToUsd(wei) {
  const weiBigInt = BigInt(wei);
  // Convert to ETH (as number for dollar calculation)
  const ethAmount = Number(weiBigInt) / Number(WEI_PER_ETH);
  const usdAmount = ethAmount * ETH_USD_RATE;
  return Math.round(usdAmount * 100);
}

/**
 * Format wei as human-readable ETH
 * @param {string} wei
 * @returns {string} - e.g., "0.03333333 ETH"
 */
function formatAmount(wei) {
  const weiBigInt = BigInt(wei);
  const ethAmount = Number(weiBigInt) / Number(WEI_PER_ETH);
  return ethAmount.toFixed(8) + ' ETH';
}

// ========== EXPLORER ==========

/**
 * Get Etherscan Sepolia explorer URL for transaction
 * @param {string} txHash
 * @returns {string}
 */
function getExplorerUrl(txHash) {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

/**
 * Get Etherscan Sepolia explorer URL for address
 * @param {string} address
 * @returns {string}
 */
function getAddressExplorerUrl(address) {
  return `https://sepolia.etherscan.io/address/${address}`;
}

// ========== UTILITIES ==========

/**
 * Generate a simulated transaction hash
 * Looks like a real Ethereum txid (66 hex chars with 0x prefix)
 * @returns {string}
 */
function generateSimulatedTxHash() {
  return 'sim_eth_0x' + crypto.randomBytes(32).toString('hex');
}

/**
 * Validate Ethereum address format (basic check)
 * @param {string} address
 * @returns {boolean}
 */
function isValidAddress(address) {
  if (!address || typeof address !== 'string') return false;

  // Must start with 0x and be 42 characters total (0x + 40 hex chars)
  if (!address.startsWith('0x')) return false;
  if (address.length !== 42) return false;

  // Check if all characters after 0x are valid hex
  const hexPart = address.slice(2);
  return /^[0-9a-fA-F]+$/.test(hexPart);
}

/**
 * Normalize Ethereum address to checksum format
 * For now, just lowercase (proper checksum would use keccak256)
 * @param {string} address
 * @returns {string}
 */
function normalizeAddress(address) {
  if (!address) return '';
  return address.toLowerCase();
}

module.exports = {
  // Constants
  ETH_USD_RATE,
  WEI_PER_ETH,

  // Address generation
  generateDepositAddress,

  // Payment verification
  checkPayment,
  simulatePayment,
  clearSimulatedPayment,

  // Conversion helpers
  usdToWei,
  weiToUsd,
  formatAmount,

  // Explorer
  getExplorerUrl,
  getAddressExplorerUrl,

  // Utilities
  generateSimulatedTxHash,
  isValidAddress,
  normalizeAddress,
};
