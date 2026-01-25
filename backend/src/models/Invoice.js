const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      index: true,
    },

    // Client Info
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    clientEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    clientAddress: {
      type: String,
      default: '',
      trim: true,
    },

    // Line Items
    items: {
      type: [lineItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Invoice must have at least one line item',
      },
    },

    // Totals (stored in cents)
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },

    // ========== MULTI-CHAIN PAYMENT OPTIONS ==========

    // Which payment rails are enabled for this invoice
    paymentOptions: {
      allowBtc: { type: Boolean, default: true },
      allowEth: { type: Boolean, default: true },
      allowSol: { type: Boolean, default: true },
    },

    // Deposit addresses (generated when invoice is sent)
    depositAddresses: {
      btc: { type: String, default: '' },
      eth: { type: String, default: '' },
      sol: { type: String, default: '' },
    },

    // Solana-specific (for Solana Pay support)
    referencePublicKey: {
      type: String,
      default: null,
    },
    solanaPayUrl: {
      type: String,
      default: null,
    },

    // ========== CONVERSION & SETTLEMENT CONFIG ==========

    // Conversion mode: MODE_A (convert & settle) or MODE_B (receive in-kind)
    conversionMode: {
      type: String,
      enum: ['MODE_A', 'MODE_B'],
      default: 'MODE_A',
    },

    // Settlement target: what asset the merchant wants to receive
    settlementTarget: {
      type: String,
      enum: ['BTC', 'ETH', 'SOL', 'USD'],
      default: 'USD',
    },

    // Auto-cashout to fiat (only applies when settlementTarget is USD)
    autoCashout: {
      type: Boolean,
      default: true,
    },

    // ========== LOCKED QUOTE (captured at payment time) ==========

    lockedQuote: {
      paymentChain: { type: String, enum: ['BTC', 'ETH', 'SOL'] },
      paymentAmount: { type: String }, // Amount in native units
      paymentAmountUsd: { type: Number }, // USD cents value
      rates: {
        btc: { type: Number }, // BTC price in USD
        eth: { type: Number }, // ETH price in USD
        sol: { type: Number }, // SOL price in USD
      },
      lockedAt: { type: Date },
      expiresAt: { type: Date },
    },

    // ========== STATUS ==========

    status: {
      type: String,
      enum: [
        'DRAFT',
        'SENT',
        'PENDING',
        'PAID_DETECTED',
        'CONVERTING',
        'SETTLING',
        'CASHED_OUT',
        'COMPLETE',
        'CANCELLED',
        'FAILED',
      ],
      default: 'DRAFT',
      index: true,
    },

    // ========== TRANSACTION REFERENCES ==========

    paymentTxHash: {
      type: String,
      default: null,
    },
    conversionTxHash: {
      type: String,
      default: null,
    },
    settlementTxHash: {
      type: String,
      default: null,
    },
    nessieTransferId: {
      type: String,
      default: null,
    },

    // ========== TIMESTAMPS ==========

    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    convertedAt: {
      type: Date,
      default: null,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    cashedOutAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },

    // Notes
    notes: {
      type: String,
      default: '',
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for business + invoice number uniqueness
invoiceSchema.index({ businessId: 1, invoiceNumber: 1 }, { unique: true });

// Calculate totals before saving
invoiceSchema.pre('save', function () {
  if (this.items && this.items.length > 0) {
    // Calculate each item amount and subtotal
    this.subtotal = this.items.reduce((sum, item) => {
      item.amount = item.quantity * item.unitPrice;
      return sum + item.amount;
    }, 0);
    this.total = this.subtotal + (this.tax || 0);
  }
});

// Virtual for formatted total
invoiceSchema.virtual('formattedTotal').get(function () {
  return `$${(this.total / 100).toFixed(2)}`;
});

// Virtual for payment mode description
invoiceSchema.virtual('modeDescription').get(function () {
  if (this.conversionMode === 'MODE_B') {
    return 'Receive In-Kind';
  }
  return this.settlementTarget === 'USD'
    ? 'Convert & Auto-Cashout'
    : `Convert to ${this.settlementTarget}`;
});

// Virtual for enabled chains
invoiceSchema.virtual('enabledChains').get(function () {
  const chains = [];
  if (this.paymentOptions?.allowBtc) chains.push('BTC');
  if (this.paymentOptions?.allowEth) chains.push('ETH');
  if (this.paymentOptions?.allowSol) chains.push('SOL');
  return chains;
});

// Enable virtuals in JSON
invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
