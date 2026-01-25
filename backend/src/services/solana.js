/**
 * Solana Pay Service
 *
 * Non-custodial payment integration using Solana Pay protocol.
 * No private keys required - we only generate payment URLs and verify transactions.
 */

const crypto = require('crypto');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { encodeURL, findReference, validateTransfer } = require('@solana/pay');
const BigNumber = require('bignumber.js');
const QRCode = require('qrcode');
const config = require('../config/env');
const { getTokenMint, getTokenDecimals, usdCentsToTokenAmount, toSmallestUnit } = require('../config/tokens');

// ========== CONSTANTS ==========

// Demo exchange rate (1 SOL = $150 USD) - matches DEMO_RATES in tokens.js
const SOL_USD_RATE = 150;

// 1 SOL = 1,000,000,000 lamports
const LAMPORTS_PER_SOL = 1_000_000_000;

// In-memory store for simulated payments (for demo consistency with BTC/ETH)
const simulatedPayments = new Map();

// Initialize Solana connection
const getConnection = () => {
  return new Connection(config.solanaRpcUrl, 'confirmed');
};

/**
 * Generate a unique reference for tracking a payment
 * The reference is a random public key that we include in the payment URL
 * We can later search the blockchain for transactions containing this reference
 */
const generateReference = () => {
  const keypair = Keypair.generate();
  return keypair.publicKey.toBase58();
};

/**
 * Create a Solana Pay URL for a payment request
 *
 * @param {Object} params
 * @param {string} params.recipient - Merchant's wallet address (public key)
 * @param {number} params.amountUsdCents - Amount in USD cents
 * @param {string} params.token - 'SOL' or 'USDC'
 * @param {string} params.reference - Unique reference public key
 * @param {string} params.label - Merchant/business name
 * @param {string} params.message - Payment description (e.g., "Invoice INV-0001")
 * @param {string} params.memo - Optional memo to include in transaction
 * @returns {Object} { url, amount, amountSmallestUnit }
 */
const createPaymentUrl = ({ recipient, amountUsdCents, token, reference, label, message, memo }) => {
  // Convert USD cents to token amount
  const tokenAmount = usdCentsToTokenAmount(amountUsdCents, token);
  const amountSmallestUnit = toSmallestUnit(tokenAmount, token);

  // Build URL parameters
  const urlParams = {
    recipient: new PublicKey(recipient),
    amount: new BigNumber(tokenAmount),
    reference: new PublicKey(reference),
    label,
    message,
  };

  // Add SPL token mint if not SOL
  if (token !== 'SOL') {
    const network = config.solanaRpcUrl.includes('devnet') ? 'devnet' : 'mainnet';
    const mint = getTokenMint(token, network);
    if (mint) {
      urlParams.splToken = new PublicKey(mint);
    }
  }

  // Add memo if provided
  if (memo) {
    urlParams.memo = memo;
  }

  // Encode the URL
  const url = encodeURL(urlParams);

  return {
    url: url.toString(),
    amount: tokenAmount,
    amountSmallestUnit,
    token,
  };
};

/**
 * Generate a QR code for a Solana Pay URL
 *
 * @param {string} url - Solana Pay URL
 * @param {Object} options - QR code options
 * @returns {Promise<string>} Base64 encoded PNG image
 */
const generateQRCode = async (url, options = {}) => {
  const defaultOptions = {
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  };

  const qrOptions = { ...defaultOptions, ...options };

  // Generate as data URL (base64)
  const dataUrl = await QRCode.toDataURL(url, qrOptions);
  return dataUrl;
};

/**
 * Generate QR code as buffer (for serving as image)
 */
const generateQRCodeBuffer = async (url, options = {}) => {
  const defaultOptions = {
    type: 'png',
    width: 400,
    margin: 2,
  };

  const qrOptions = { ...defaultOptions, ...options };
  return QRCode.toBuffer(url, qrOptions);
};

/**
 * Check if a payment has been made for a given reference
 *
 * @param {string} reference - The reference public key to search for
 * @returns {Promise<Object|null>} Transaction info if found, null otherwise
 */
const checkPayment = async (reference) => {
  const connection = getConnection();

  try {
    const signatureInfo = await findReference(connection, new PublicKey(reference), {
      finality: 'confirmed',
    });

    return {
      signature: signatureInfo.signature,
      slot: signatureInfo.slot,
      found: true,
    };
  } catch (error) {
    // FindReferenceError means no transaction found yet
    if (error.name === 'FindReferenceError') {
      return { found: false };
    }
    throw error;
  }
};

/**
 * Validate a payment transaction
 *
 * @param {string} signature - Transaction signature
 * @param {string} recipient - Expected recipient address
 * @param {number} expectedAmountUsdCents - Expected amount in USD cents
 * @param {string} token - 'SOL' or 'USDC'
 * @param {string} reference - Reference public key
 * @returns {Promise<Object>} Validation result
 */
const validatePayment = async (signature, recipient, expectedAmountUsdCents, token, reference) => {
  const connection = getConnection();

  const tokenAmount = usdCentsToTokenAmount(expectedAmountUsdCents, token);

  const validateParams = {
    recipient: new PublicKey(recipient),
    amount: new BigNumber(tokenAmount),
    reference: new PublicKey(reference),
  };

  // Add SPL token mint if not SOL
  if (token !== 'SOL') {
    const network = config.solanaRpcUrl.includes('devnet') ? 'devnet' : 'mainnet';
    const mint = getTokenMint(token, network);
    if (mint) {
      validateParams.splToken = new PublicKey(mint);
    }
  }

  try {
    const response = await validateTransfer(connection, signature, validateParams, {
      commitment: 'confirmed',
    });

    return {
      valid: true,
      signature,
      response,
    };
  } catch (error) {
    return {
      valid: false,
      signature,
      error: error.message,
    };
  }
};

/**
 * Full payment verification flow
 * Check for payment, then validate if found
 *
 * @param {Object} invoice - Invoice object with payment details
 * @returns {Promise<Object>} Payment status
 */
const verifyPayment = async (invoice) => {
  if (!invoice.referencePublicKey) {
    return { found: false, error: 'No reference key set for invoice' };
  }

  // Check if payment exists
  const paymentCheck = await checkPayment(invoice.referencePublicKey);

  if (!paymentCheck.found) {
    return { found: false, status: 'PENDING' };
  }

  // Validate the payment
  const validation = await validatePayment(
    paymentCheck.signature,
    invoice.recipientAddress,
    invoice.total,
    invoice.paymentToken,
    invoice.referencePublicKey
  );

  if (validation.valid) {
    return {
      found: true,
      valid: true,
      status: 'PAID',
      signature: paymentCheck.signature,
      slot: paymentCheck.slot,
    };
  } else {
    return {
      found: true,
      valid: false,
      status: 'INVALID',
      signature: paymentCheck.signature,
      error: validation.error,
    };
  }
};

/**
 * Get the explorer URL for a transaction
 */
const getExplorerUrl = (signature, network = 'devnet') => {
  const cluster = network === 'mainnet' ? '' : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
};

/**
 * Get the explorer URL for an address
 */
const getAddressExplorerUrl = (address, network = 'devnet') => {
  const cluster = network === 'mainnet' ? '' : `?cluster=${network}`;
  return `https://explorer.solana.com/address/${address}${cluster}`;
};

// ========== CHAINS.JS COMPATIBILITY ==========

/**
 * Generate deposit address for Solana Pay
 * This wraps Solana Pay's reference-based system for chains.js compatibility
 *
 * @param {string} recipientAddress - Merchant's wallet address
 * @returns {{ address: string, reference: string }}
 */
const generateDepositAddress = (recipientAddress) => {
  const reference = generateReference();
  return {
    address: recipientAddress, // Solana Pay sends to merchant directly
    reference, // Unique reference for tracking this payment
  };
};

/**
 * Simulate a payment being received (for demo consistency with BTC/ETH)
 * @param {string} reference - Reference public key
 * @param {string} amount - Amount in lamports
 * @returns {{ txHash: string }}
 */
const simulatePayment = (reference, amount) => {
  const txHash = generateSimulatedTxHash();

  simulatedPayments.set(reference, {
    txHash,
    amount,
    found: true,
    detectedAt: new Date(),
  });

  return { txHash };
};

/**
 * Clear a simulated payment (for testing)
 * @param {string} reference
 */
const clearSimulatedPayment = (reference) => {
  simulatedPayments.delete(reference);
};

/**
 * Check payment with simulation support
 * Tries simulated payments first, then falls back to real blockchain check
 * @param {string} reference
 * @returns {Promise<Object>}
 */
const checkPaymentWithSimulation = async (reference) => {
  // Check simulated payments first
  const simulated = simulatedPayments.get(reference);
  if (simulated) {
    return {
      found: true,
      signature: simulated.txHash,
      amount: simulated.amount,
    };
  }

  // Fall back to real blockchain check
  try {
    return await checkPayment(reference);
  } catch (error) {
    return { found: false, error: error.message };
  }
};

/**
 * Generate a simulated transaction hash
 * @returns {string}
 */
const generateSimulatedTxHash = () => {
  return 'sim_sol_' + crypto.randomBytes(32).toString('hex');
};

// ========== CONVERSION HELPERS ==========

/**
 * Convert USD cents to lamports
 * @param {number} usdCents
 * @returns {string} - Lamports as string for precision
 */
const usdToLamports = (usdCents) => {
  const usdAmount = usdCents / 100;
  const solAmount = usdAmount / SOL_USD_RATE;
  const lamports = Math.ceil(solAmount * LAMPORTS_PER_SOL);
  return String(lamports);
};

/**
 * Convert lamports to USD cents
 * @param {string} lamports
 * @returns {number} - USD cents
 */
const lamportsToUsd = (lamports) => {
  const solAmount = Number(lamports) / LAMPORTS_PER_SOL;
  const usdAmount = solAmount * SOL_USD_RATE;
  return Math.round(usdAmount * 100);
};

/**
 * Format lamports as human-readable SOL
 * @param {string} lamports
 * @returns {string} - e.g., "0.666666667 SOL"
 */
const formatAmount = (lamports) => {
  const solAmount = Number(lamports) / LAMPORTS_PER_SOL;
  return solAmount.toFixed(9) + ' SOL';
};

/**
 * Validate Solana address format (basic check)
 * @param {string} address
 * @returns {boolean}
 */
const isValidAddress = (address) => {
  if (!address || typeof address !== 'string') return false;

  // Solana addresses are base58 encoded and 32-44 characters
  if (address.length < 32 || address.length > 44) return false;

  // Check for valid base58 characters (no 0, O, I, l)
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
};

module.exports = {
  // Constants
  SOL_USD_RATE,
  LAMPORTS_PER_SOL,

  // Core Solana Pay
  getConnection,
  generateReference,
  createPaymentUrl,
  generateQRCode,
  generateQRCodeBuffer,
  checkPayment,
  validatePayment,
  verifyPayment,
  getExplorerUrl,
  getAddressExplorerUrl,

  // Chains.js compatibility
  generateDepositAddress,
  simulatePayment,
  clearSimulatedPayment,
  checkPaymentWithSimulation,
  generateSimulatedTxHash,

  // Conversion helpers
  usdToLamports,
  lamportsToUsd,
  formatAmount,

  // Utilities
  isValidAddress,
};
