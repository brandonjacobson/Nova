const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletTransactionSchema = new Schema(
    {
        wallet: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
            required: true,
            index: true,
        },

        // Direction relative to THIS wallet
        direction: {
            type: String,
            enum: ['INCOMING', 'OUTGOING'],
            required: true,
        },

        // What asset is moving
        assetSymbol: {
            type: String,
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        amountUSD: {
            type: Number,
        },

        txHash: {
            type: String,
            trim: true,
        },

        status: {
            type: String,
            enum: ['PENDING', 'COMPLETED', 'FAILED'],
            default: 'PENDING',
            index: true,
        },

        // Chain Metadata
        blockHeight: {
            type: Number,
        },
        confirmations: {
            type: Number,
        },

        // Links back to domain models
        payment: {
            type: Schema.Types.ObjectId,
            ref: 'Payment',
        },
        cashout: {
            type: Schema.Types.ObjectId,
            ref: 'FiatSettlement',
        },
        conversion: {
            type: Schema.Types.ObjectId,
            ref: 'Conversion',
        },
    },
    { timestamps: true }
);

walletTransactionSchema.index({ wallet: 1, createdAt: -1 });

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

module.exports = WalletTransaction;