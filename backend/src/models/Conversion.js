const mongoose = require('mongoose');

const conversionSchema = new mongoose.Schema(
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
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },

    // Conversion details
    fromAsset: {
      type: String,
      enum: ['BTC', 'ETH', 'SOL'],
      required: true,
    },
    toAsset: {
      type: String,
      enum: ['BTC', 'ETH', 'SOL', 'USD'],
      required: true,
    },
    fromAmount: {
      type: String,
      required: true, // Native units as string for precision
    },
    toAmount: {
      type: String,
      required: true, // Native units as string for precision
    },
    fromAmountUsd: {
      type: Number,
      required: true, // USD cents
    },
    toAmountUsd: {
      type: Number,
      required: true, // USD cents
    },

    // Conversion route
    route: {
      type: String,
      enum: ['DIRECT', 'VIA_STABLE'],
      default: 'VIA_STABLE',
    },
    pivotAsset: {
      type: String,
      default: 'USD', // For simulated conversions
    },

    // Exchange rates used
    rates: {
      btc: { type: Number }, // BTC price in USD
      eth: { type: Number }, // ETH price in USD
      sol: { type: Number }, // SOL price in USD
    },

    // Status
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },

    // Transaction hash (simulated for demo)
    txHash: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },

    // Timestamps
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for formatted USD values
conversionSchema.virtual('formattedFromUsd').get(function () {
  return `$${(this.fromAmountUsd / 100).toFixed(2)}`;
});

conversionSchema.virtual('formattedToUsd').get(function () {
  return `$${(this.toAmountUsd / 100).toFixed(2)}`;
});

conversionSchema.set('toJSON', { virtuals: true });
conversionSchema.set('toObject', { virtuals: true });

const Conversion = mongoose.model('Conversion', conversionSchema);

module.exports = Conversion;
