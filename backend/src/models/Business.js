const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [100, 'Business name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Solana Configuration
    solanaWalletAddress: {
      type: String,
      default: null,
    },
    // Nessie Configuration
    nessieAccountId: {
      type: String,
      default: null,
    },
    // Invoice Settings
    defaultCurrency: {
      type: String,
      default: 'USD',
      enum: ['USD'],
    },
    invoicePrefix: {
      type: String,
      default: 'INV-',
      maxlength: 10,
    },
    invoiceCounter: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Generate next invoice number
businessSchema.methods.getNextInvoiceNumber = async function () {
  this.invoiceCounter += 1;
  await this.save();
  return `${this.invoicePrefix}${String(this.invoiceCounter).padStart(4, '0')}`;
};

const Business = mongoose.model('Business', businessSchema);

module.exports = Business;
