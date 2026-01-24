const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
  {
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },
    // Nessie Transfer Details
    nessieTransferId: {
      type: String,
      default: null,
    },
    fromAccountId: {
      type: String,
      required: true,
    },
    toAccountId: {
      type: String,
      required: true,
    },
    amountCents: {
      type: Number,
      required: true,
    },
    // Status
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Fees (future)
    feeCents: {
      type: Number,
      default: 0,
    },
    netAmountCents: {
      type: Number,
      default: null,
    },
    // Error tracking
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate net amount before saving
settlementSchema.pre('save', function (next) {
  this.netAmountCents = this.amountCents - (this.feeCents || 0);
  next();
});

// Virtual for formatted amounts
settlementSchema.virtual('formattedAmount').get(function () {
  return `$${(this.amountCents / 100).toFixed(2)}`;
});

settlementSchema.virtual('formattedNetAmount').get(function () {
  return `$${(this.netAmountCents / 100).toFixed(2)}`;
});

settlementSchema.set('toJSON', { virtuals: true });
settlementSchema.set('toObject', { virtuals: true });

const Settlement = mongoose.model('Settlement', settlementSchema);

module.exports = Settlement;
