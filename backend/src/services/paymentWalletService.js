const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const Payment = require('../models/Payment');
const { applyTransactionToBalance } = require('./walletBalanceService');

/**
 * Convert smallest units string to asset units as Number
 * NOTE: This uses Number(), which is fine for now. If you ever move massive amounts
 * you can swap to Decimal128.
 */
function toAssetAmount(chain, amountStr) {
    const n = BigInt(amountStr);

    switch (chain) {
        case 'BTC':
            // satoshis to BTC
            return Number(n) / 100_000_000;
        case 'ETH':
            // wei to ETH
            return Number(n) / 1e18;
        case 'SOL':
            // lamports to SOL
            return Number(n) / 1_000_000_000;
        default:
            throw new Error(`Unsupported chain: ${chain}`);
    }
}

/**
 * Create a WalletTransaction for a Payment and update balances.
 * Call this when you log a new on-chain payment, or when it moves from
 * PENDING -> CONFIRMED (we can refine that later if you want).
 */
async function attachWalletToPayment(paymentId) {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  const businessId = payment.businessId;
  const chain = payment.chain;
  
  // 1. Find the wallet for this business + chain
  const wallet = await Wallet.findOne({
    business: businessId,
    chain,
    type: 'SETTLEMENT',
  });

  if (!wallet) {
    throw new Error(`No wallet configured for chain ${chain} for this business`);
  }

  // Compute asset amount & USD amount
  const assetAmount = toAssetAmount(chain, payment.amount);
  const usdAmount =
    typeof payment.usdValueCents === 'number'
        ? payment.usdValueCents / 100
        : null;

  // Map Payment.status (PENDING/CONFIRMED/FAILED) to tx.status (lowercase)
  const statusMap = {
    PENDING: 'PENDING',
    CONFIRMED: 'COMPLETED',
    FAILED: 'FAILED',
  };

  const txStatus = statusMap[payment.status] || 'PENDING';
  }

  // 3. Create WalletTransaction
  const tx = await WalletTransaction.create({
    wallet: wallet._id,
    direction: 'INCOMING',
    assetSymbol: chain,
    amount: assetAmount,
    amountUSD: usdAmount,
    txHash: payment.txHash,
    status: txStatus,
    confirmations: payment.confirmations || 0,
    payment: payment._id,
  });

  // 4. Update balances
  await applyTransactionToBalance(tx);

  // 5. Link back on Payment
  payment.wallet = wallet._id;
  payment.walletTransaction = tx._id;
  await payment.save();

  return { payment, wallet, tx };
}

module.exports = { attachWalletToPayment };