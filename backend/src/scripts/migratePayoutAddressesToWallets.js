require('dotenv').config();
const mongoose = require('mongoose');
const Business = require('../models/Business');
const Wallet = require('../models/Wallet');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);

    const businesses = await Business.find({});
    console.log(`Found ${businesses.length} businesses to process.`);

    for (const biz of businesses) {
        const ops = [];

        ops.push(
            Wallet.updateOne(
                { business: biz._id, chain: 'BTC', type: 'SETTLEMENT' },
                {
                    $setOnInsert: {
                        label: `${biz.name} BTC Wallet`,
                        address: biz.payoutAddresses.BTC,
                        isPrimary: true,
                    },
                },
                { upsert: true }
            )
        );

        
        ops.push(
            Wallet.updateOne(
                { business: biz._id, chain: 'ETH', type: 'SETTLEMENT' },
                {
                    $setOnInsert: {
                        label: `${biz.name} ETH Wallet`,
                        address: biz.payoutAddresses.ETH,
                        isPrimary: true,
                    },
                },
                { upsert: true }
            )
        );
    

        
        ops.push(
            Wallet.updateOne(
                { business: biz._id, chain: 'SOL', type: 'SETTLEMENT' },
                {
                    $setOnInsert: {
                        label: `${biz.name} SOL Wallet`,
                        address: biz.payoutAddresses.SOL,
                        isPrimary: true,
                    },
                },
                { upsert: true }
            )
        );
    

        await Promise.all(ops);
    }

    await mongoose.disconnect();
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});