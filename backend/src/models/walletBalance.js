const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletBalanceSchema = new Schema(
    {
        wallet: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
            required: true,
            index: true,
        },

        assetSymbol: {
            type: String,
            required: true,
        },

        confirmed: {
            type: Number,
            default: 0,
        },

        pending: {
            type: Number,
            default: 0,
        },

        lastSyncAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);
    
walletBalanceSchema.index({ wallet: 1, assetSymbol: 1 }, { unique: true });

const WalletBalance = mongoose.model('WalletBalance', walletBalanceSchema);

module.exports = WalletBalance;
    
