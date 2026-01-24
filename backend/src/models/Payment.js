const mongoose = require('mongoose');

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
    // Solana Transaction Details
    transactionSignature: {
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
    amountLamports: {
      type: Number,
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
    solUsdRate: {
      type: Number,
      default: null,
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

// Virtual for SOL amount (1 SOL = 1,000,000,000 lamports)
paymentSchema.virtual('amountSol').get(function () {
  return this.amountLamports / 1_000_000_000;
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
