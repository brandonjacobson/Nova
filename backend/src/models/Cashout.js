const mongoose = require('mongoose');

const cashoutSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    conversionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversion',
      default: null,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },

    // Nessie details
    nessieTransferId: {
      type: String,
      default: null,
    },
    nessieAccountId: {
      type: String,
      required: true, // Merchant's Nessie account
    },

    // Amount
    amountCents: {
      type: Number,
      required: true, // USD cents
    },

    // Status
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
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

// Virtual for formatted USD amount
cashoutSchema.virtual('formattedAmount').get(function () {
  return `$${(this.amountCents / 100).toFixed(2)}`;
});

cashoutSchema.set('toJSON', { virtuals: true });
cashoutSchema.set('toObject', { virtuals: true });

const Cashout = mongoose.model('Cashout', cashoutSchema);

module.exports = Cashout;
