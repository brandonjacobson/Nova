const mongoose = require('mongoose');
const { Schema } = mongoose;

const fiatSettlementSchema = new Schema(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    bankAccountId: {
      type: String,
      required: true,
    },
    amountCents: {
      type: Number,
      required: true,
      min: 0,
    },
    bankTransferId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    completedAt: {
      type: Date,
    },
    rawResponse: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FiatSettlement', fiatSettlementSchema);
