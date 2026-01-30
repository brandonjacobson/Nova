const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ASSETS, getDecimals } = require('../config/assets');

const settlementSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    conversionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversion',
      default: null, // Null for Mode B (no conversion)
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },

    // Settlement asset
    asset: {
      type: String,
      enum: ['BTC', 'ETH', 'SOL', 'USDC', 'USDT'],
      required: true,
    },

    // Amount in smallest unit (satoshis, wei, lamports) as string for precision
    amount: {
      type: String,
      required: true,
    },

    // USD value at settlement time
    amountUsd: {
      type: Number,
      required: true, // USD cents
    },

    // Destination (merchant's payout address)
    toAddress: {
      type: String,
      required: true,
    },

    // Transaction hash
    txHash: {
      type: String,
      default: null,
    },

    // Status
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },

    // Error tracking
    errorMessage: {
      type: String,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for human-readable amount based on asset
settlementSchema.virtual('amountFormatted').get(function () {
  const amountBig = BigInt(this.amount);
  const decimals = getDecimals(this.asset);
  const factor = 10n ** BigInt(decimals);

  const value = Number(amountBig) / Number(factor);

  const displayDecimals = Math.min(decimals, 8); // Limit to 8 decimals for display
  
  
  return `${value.toFixed(displayDecimals)} ${this.asset}`;
});

// Virtual for formatted USD value
settlementSchema.virtual('formattedAmountUsd').get(function () {
  return `$${(this.amountUsd / 100).toFixed(2)}`;
});

settlementSchema.set('toJSON', { virtuals: true });
settlementSchema.set('toObject', { virtuals: true });

const Settlement = mongoose.model('Settlement', settlementSchema);

module.exports = Settlement;
