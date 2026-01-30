const WalletBalance = require('../models/walletBalance');

async function applyTransactionToBalance(tx) {
    const sign = tx.direction === 'INCOMING' ? 1 : -1;
    const delta = sign * tx.amount;

    const balance = await WalletBalance.findOneAndUpdate(
        { wallet: tx.wallet, assetSymbol: tx.assetSymbol },
        {
            $setOnInsert: { confirmed: 0, pending: 0 },
            $inc: 
                tx.status === 'PENDING' 
                ? { pending: delta } 
                : tx.status === 'CONFIRMED' 
                ? { confirmed: delta } 
                : {},
            $set: { lastSyncAt: new Date() },
        },
        { upsert: true, new: true }
    );

    return balance;
}

module.exports = { applyTransactionToBalance };