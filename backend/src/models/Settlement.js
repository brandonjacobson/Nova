const mongoose = require('mongoose');

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
      enum: ['BTC', 'ETH', 'SOL'],
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
  const amount = BigInt(this.amount);
  switch (this.asset) {
    case 'BTC':
      return (Number(amount) / 100_000_000).toFixed(8) + ' BTC';
    case 'ETH':
      return (Number(amount) / 1e18).toFixed(8) + ' ETH';
    case 'SOL':
      return (Number(amount) / 1_000_000_000).toFixed(9) + ' SOL';
    default:
      return this.amount;
  }
});

// Virtual for formatted USD value
settlementSchema.virtual('formattedAmountUsd').get(function () {
  return `$${(this.amountUsd / 100).toFixed(2)}`;
});

settlementSchema.set('toJSON', { virtuals: true });
settlementSchema.set('toObject', { virtuals: true });

const Settlement = mongoose.model('Settlement', settlementSchema);

module.exports = Settlement;
