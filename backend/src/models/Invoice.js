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
      required: [true, 'Client email is required'],
      lowercase: true,
      trim: true,
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
    // Payment Config (Solana Pay)
    paymentToken: {
      type: String,
      enum: ['SOL', 'USDC'],
      default: 'SOL',
    },
    recipientAddress: {
      type: String,
      default: null, // Business's Solana wallet address
    },
    referencePublicKey: {
      type: String,
      default: null, // Unique reference for tracking payment on-chain
    },
    solanaPayUrl: {
      type: String,
      default: null, // Encoded Solana Pay URL
    },
    paymentAmount: {
      type: Number,
      default: null, // Amount in token units (e.g., 1.5 SOL)
    },
    paymentAmountSmallestUnit: {
      type: Number,
      default: null, // Amount in smallest unit (lamports for SOL)
    },
    transactionSignature: {
      type: String,
      default: null, // Stored after payment confirmed
    },
    // Status
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'PENDING', 'PAID', 'SETTLED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    // Dates
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    settledAt: {
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

// Calculate totals before saving (Mongoose 9.x - no next() needed)
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

// Enable virtuals in JSON
invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
