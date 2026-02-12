const mongoose = require('mongoose');
const { ASSETS, getDecimals } = require('../config/assets');

const paymentSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },

    // Wallet that received this payment
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      defalult: null,
    },

    // WalletTransaction created for this payment
    walletTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WalletTransaction',
      default: null,
    },

    // Chain identifier (multi-chain support)
    chain: {
      type: String,
      enum: ['BTC', 'ETH', 'SOL'],
      required: true,
    },

    // Asset that was paid 
    assetSymbol: {
      type: String,
      enum: Object.keys(ASSETS),
      required: true,
    },

    // Transaction Details (generalized)
    txHash: {
      type: String,
      required: true,
      unique: true,
    },
    fromAddress: {
      type: String,
      required: true,
    },
    toAddress: {
      type: String,
      required: true,
    },

    // Amount in smallest unit (satoshis, wei, lamports) as string for precision
    amount: {
      type: String,
      required: true,
    },

    // Verification
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'FAILED'],
      default: 'PENDING',
    },
    confirmations: {
      type: Number,
      default: 0,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },

    // Exchange Rate (at time of payment)
    exchangeRate: {
      type: Number,
      default: null, // USD price of asset at payment time
    },
    usdValueCents: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for human-readable amount based on chain
paymentSchema.virtual('amountFormatted').get(function () {
  const amount = BigInt(this.amount);
  switch (this.chain) {
    case 'BTC':
      // 1 BTC = 100,000,000 satoshis
      return (Number(amount) / 100_000_000).toFixed(8) + ' BTC';
    case 'ETH':
      // 1 ETH = 10^18 wei
      return (Number(amount) / 1e18).toFixed(8) + ' ETH';
    case 'SOL':
      // 1 SOL = 1,000,000,000 lamports
      return (Number(amount) / 1_000_000_000).toFixed(9) + ' SOL';
    default:
      return this.amount;
  }
});

// Virtual for formatted USD value
paymentSchema.virtual('formattedUsdValue').get(function () {
  if (!this.usdValueCents) return null;
  return `$${(this.usdValueCents / 100).toFixed(2)}`;
});

paymentSchema.set('toJSON', { virtuals: true });
paymentSchema.set('toObject', { virtuals: true });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
