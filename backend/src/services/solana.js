/**
 * Solana Pay Service
 *
 * Non-custodial payment integration using Solana Pay protocol.
 * No private keys required - we only generate payment URLs and verify transactions.
 */

const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { encodeURL, findReference, validateTransfer } = require('@solana/pay');
const BigNumber = require('bignumber.js');
const QRCode = require('qrcode');
const config = require('../config/env');
const { getTokenMint, getTokenDecimals, usdCentsToTokenAmount, toSmallestUnit } = require('../config/tokens');

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

module.exports = {
  getConnection,
  generateReference,
  createPaymentUrl,
  generateQRCode,
  generateQRCodeBuffer,
  checkPayment,
  validatePayment,
  verifyPayment,
  getExplorerUrl,
};
