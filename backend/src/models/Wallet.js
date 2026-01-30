const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletSchema = new Schema(
    {
        business: {
            type: Schema.Types.ObjectId,
            ref: 'Business',
            required: true,
            index: true,
        },

        // What chain / network this wallet belongs to
        chain: {
            type: String,
            enum: ['BTC', 'ETH', 'SOL'],
            required: true,
        },

        //Purpose of this wallet 
        type: {
            type: String,
            enum: ['COLD', 'HOT', 'SETTLEMENT', 'FEES'],
            default: 'HOT',
        }, 

        // Human-friendly name
        label: {
            type: String,
            default: '',
            trim: true,
        },

        // For crypto wallets
        address: {
            type: String,
            trim: true,
        },

        isPrimary: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

walletSchema.index({ business: 1, chain: 1, type: 1 }, { unique: true });
const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;