/**
 * Seed script for Nova Multi-Chain demo data
 *
 * Usage: node src/scripts/seed.js
 *
 * Creates:
 * - 1 demo business with multi-chain payout addresses
 * - 1 demo user (demo@nova.app / password123)
 * - 10 sample invoices in various states showcasing multi-chain flow
 * - Sample Payment, Conversion, and Cashout records
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');
const { Business, User, Invoice, Payment, Settlement, Conversion, FiatSettlement } = require('../models');

const DEMO_PASSWORD = 'password123';

// Demo addresses (testnets)
const DEMO_ADDRESSES = {
  btc: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', // Bitcoin testnet
  eth: '0x742d35Cc6634C0532925a3b844Bc9e7595f3dF21', // Ethereum Sepolia
  sol: 'AtWKwhUsdVHYgrNBHyTh1GHoien8nHYwoYuEC7Jka17B', // Solana devnet
};

// Demo deposit addresses for invoices
const DEPOSIT_ADDRESSES = {
  btc: 'tb1q7zy9a9v9mse3zkuqwlg7c6knhkfwcqxzqw3yhy',
  eth: '0x8a1b2C3d4E5f6A7B8c9D0E1f2A3b4C5d6E7f8A9B',
  sol: 'HgWFDGqxE2RAqd4C7kd4GueGEhcwejVdZCAupULLJfaF',
};

const seedData = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      Business.deleteMany({}),
      User.deleteMany({}),
      Invoice.deleteMany({}),
      Payment.deleteMany({}),
      Settlement.deleteMany({}),
      Conversion.deleteMany({}),
      FiatSettlement.deleteMany({}),
    ]);

    // Create demo business with multi-chain configuration
    console.log('Creating demo business with multi-chain config...');
    const business = await Business.create({
      name: 'Nova Demo Business',
      email: 'demo@nova.app',
      invoicePrefix: 'NOVA-',
      invoiceCounter: 0,
      defaultCurrency: 'USD',
      // Payout addresses (ETH, SOL - no BTC for MVP)
      payoutAddresses: {
        eth: DEMO_ADDRESSES.eth,
        sol: DEMO_ADDRESSES.sol,
      },
      // Default settings
      defaultSettlementTarget: 'USD',
      defaultConversionMode: 'MODE_A',
      // Legacy field
      solanaWalletAddress: DEMO_ADDRESSES.sol,
    });

    // Create demo user
    console.log('Creating demo user...');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const user = await User.create({
      businessId: business._id,
      email: 'demo@nova.app',
      passwordHash,
      name: 'Demo User',
      role: 'owner',
    });

    // Helper to create invoices
    const createInvoice = async (data) => {
      business.invoiceCounter += 1;
      await business.save();
      const invoiceNumber = `${business.invoicePrefix}${String(business.invoiceCounter).padStart(4, '0')}`;

      // Calculate totals from items
      const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
      const tax = data.tax || 0;
      const total = subtotal + tax;

      return Invoice.create({
        businessId: business._id,
        invoiceNumber,
        subtotal,
        tax,
        total,
        ...data,
      });
    };

    // Sample clients
    const clients = [
      { name: 'TechStart Inc', email: 'billing@techstart.io' },
      { name: 'Creative Studios', email: 'accounts@creativestudios.com' },
      { name: 'DataFlow Corp', email: 'finance@dataflow.co' },
      { name: 'Green Energy LLC', email: 'payments@greenenergy.com' },
      { name: 'Urban Designs', email: 'invoices@urbandesigns.io' },
      { name: 'Blockchain Ventures', email: 'pay@blockchainventures.io' },
    ];

    console.log('Creating multi-chain invoices...');

    // ===== Invoice 1: DRAFT - Multi-chain enabled =====
    await createInvoice({
      clientName: clients[0].name,
      clientEmail: clients[0].email,
      items: [
        { description: 'Website Redesign', quantity: 1, unitPrice: 500000, amount: 500000 },
        { description: 'SEO Optimization', quantity: 1, unitPrice: 150000, amount: 150000 },
      ],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'DRAFT',
      paymentOptions: { btc: true, eth: true, sol: true },
      settlementTarget: 'USD',
      conversionMode: 'MODE_A',
      notes: 'Draft invoice - Multi-chain payment enabled',
    });

    // ===== Invoice 2: SENT - All chains enabled with deposit addresses =====
    const sentInvoice = await createInvoice({
      clientName: clients[1].name,
      clientEmail: clients[1].email,
      items: [
        { description: 'Logo Design Package', quantity: 1, unitPrice: 250000, amount: 250000 },
        { description: 'Brand Guidelines', quantity: 1, unitPrice: 100000, amount: 100000 },
      ],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'SENT',
      paymentOptions: { btc: true, eth: true, sol: true },
      depositAddresses: {
        btc: 'tb1qw2jl6g9h8yu5wqc7dvkslrk6n4w3m7hx3z6q8p',
        eth: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
        sol: '5vefVHLDfYSH1vzVQ4HMJWjNhAE7ud9FpuvHaR3mT4o3',
      },
      settlementTarget: 'USD',
      conversionMode: 'MODE_A',
      referencePublicKey: '5vefVHLDfYSH1vzVQ4HMJWjNhAE7ud9FpuvHaR3mT4o3',
      solanaPayUrl: 'solana:' + DEMO_ADDRESSES.sol + '?amount=23.33',
      lockedQuote: {
        rates: { btc: 60000, eth: 3000, sol: 150 },
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    // ===== Invoice 3: SENT - BTC only (waiting for payment) =====
    await createInvoice({
      clientName: clients[5].name,
      clientEmail: clients[5].email,
      items: [
        { description: 'Smart Contract Audit', quantity: 1, unitPrice: 1000000, amount: 1000000 },
      ],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'SENT',
      paymentOptions: { btc: true, eth: false, sol: false },
      depositAddresses: {
        btc: 'tb1q9h8r4q5j6k7l8m9n0p1q2r3s4t5u6v7w8x9y0z',
      },
      settlementTarget: 'BTC',
      conversionMode: 'MODE_B',
      lockedQuote: {
        rates: { btc: 60000, eth: 3000, sol: 150 },
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
      sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      notes: 'BTC only - Mode B (receive in-kind)',
    });

    // ===== Invoice 4: PAID_DETECTED - ETH payment detected =====
    const paidDetectedInvoice = await createInvoice({
      clientName: clients[2].name,
      clientEmail: clients[2].email,
      items: [
        { description: 'Data Migration Service', quantity: 1, unitPrice: 300000, amount: 300000 },
        { description: 'API Integration', quantity: 2, unitPrice: 75000, amount: 150000 },
      ],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'PAID_DETECTED',
      paymentOptions: { btc: true, eth: true, sol: true },
      depositAddresses: {
        btc: 'tb1qa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9',
        eth: '0x1234567890AbCdEf1234567890aBcDeF12345678',
        sol: 'Bn9JdPoovmSvMnEv8i1H41bNfzUbJ75KD3UBW3pqywdg',
      },
      settlementTarget: 'SOL',
      conversionMode: 'MODE_A',
      lockedQuote: {
        paymentChain: 'ETH',
        paymentAmount: '0.15',
        paymentAmountUsd: 45000,
        rates: { btc: 60000, eth: 3000, sol: 150 },
        lockedAt: new Date(Date.now() - 10 * 60 * 1000),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      paymentTxHash: '0xabc123def456789abc123def456789abc123def456789abc123def456789abcd',
      paidAt: new Date(Date.now() - 5 * 60 * 1000),
      sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    // Create Payment record for PAID_DETECTED invoice
    const ethPayment = await Payment.create({
      invoiceId: paidDetectedInvoice._id,
      businessId: business._id,
      chain: 'ETH',
      txHash: '0xabc123def456789abc123def456789abc123def456789abc123def456789abcd',
      fromAddress: '0xSenderAddress12345678901234567890123456',
      toAddress: paidDetectedInvoice.depositAddresses.eth,
      amount: '150000000000000000', // 0.15 ETH in wei
      status: 'CONFIRMED',
      confirmations: 12,
      confirmedAt: new Date(Date.now() - 5 * 60 * 1000),
      exchangeRate: 3000,
      usdValueCents: 45000,
    });

    // ===== Invoice 5: CONVERTING - SOL → BTC conversion in progress =====
    const convertingInvoice = await createInvoice({
      clientName: clients[3].name,
      clientEmail: clients[3].email,
      items: [
        { description: 'Solar Panel Website', quantity: 1, unitPrice: 450000, amount: 450000 },
      ],
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: 'CONVERTING',
      paymentOptions: { btc: false, eth: false, sol: true },
      depositAddresses: {
        sol: 'HgWFDGqxE2RAqd4C7kd4GueGEhcwejVdZCAupULLJfaF',
      },
      settlementTarget: 'BTC',
      conversionMode: 'MODE_A',
      lockedQuote: {
        paymentChain: 'SOL',
        paymentAmount: '30',
        paymentAmountUsd: 450000,
        rates: { btc: 60000, eth: 3000, sol: 150 },
        lockedAt: new Date(Date.now() - 30 * 60 * 1000),
        expiresAt: new Date(Date.now() - 15 * 60 * 1000),
      },
      paymentTxHash: '5xYz7abc123def456789SOLtxhash1234567890abcdefghijklmnop',
      paidAt: new Date(Date.now() - 20 * 60 * 1000),
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    // Create Payment for converting invoice
    const solPaymentConverting = await Payment.create({
      invoiceId: convertingInvoice._id,
      businessId: business._id,
      chain: 'SOL',
      txHash: '5xYz7abc123def456789SOLtxhash1234567890abcdefghijklmnop',
      fromAddress: 'PayerSolanaAddress123456789abcdefghijklmnopqrs',
      toAddress: convertingInvoice.depositAddresses.sol,
      amount: '30000000000', // 30 SOL in lamports
      status: 'CONFIRMED',
      confirmations: 32,
      confirmedAt: new Date(Date.now() - 20 * 60 * 1000),
      exchangeRate: 150,
      usdValueCents: 450000,
    });

    // Create Conversion record (in progress)
    await Conversion.create({
      invoiceId: convertingInvoice._id,
      paymentId: solPaymentConverting._id,
      businessId: business._id,
      fromAsset: 'SOL',
      toAsset: 'BTC',
      fromAmount: '30',
      toAmount: '0.075',
      fromAmountUsd: 450000,
      toAmountUsd: 450000,
      route: 'VIA_STABLE',
      pivotAsset: 'USD',
      rates: { btc: 60000, eth: 3000, sol: 150 },
      status: 'PROCESSING',
    });

    // ===== Invoice 6: SETTLING - BTC → BTC (Mode B, no conversion) =====
    const settlingInvoice = await createInvoice({
      clientName: clients[4].name,
      clientEmail: clients[4].email,
      items: [
        { description: 'Mobile App Development', quantity: 1, unitPrice: 800000, amount: 800000 },
        { description: 'App Store Submission', quantity: 1, unitPrice: 50000, amount: 50000 },
      ],
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'SETTLING',
      paymentOptions: { btc: true, eth: false, sol: false },
      depositAddresses: {
        btc: 'tb1qsettling12345678901234567890123456789',
      },
      settlementTarget: 'BTC',
      conversionMode: 'MODE_B',
      lockedQuote: {
        paymentChain: 'BTC',
        paymentAmount: '0.1417',
        paymentAmountUsd: 850000,
        rates: { btc: 60000, eth: 3000, sol: 150 },
        lockedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 105 * 60 * 1000),
      },
      paymentTxHash: 'btc_txhash_settling_1234567890abcdefghijklmnopqrstuv',
      paidAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });

    // Create Payment for settling invoice
    const btcPaymentSettling = await Payment.create({
      invoiceId: settlingInvoice._id,
      businessId: business._id,
      chain: 'BTC',
      txHash: 'btc_txhash_settling_1234567890abcdefghijklmnopqrstuv',
      fromAddress: 'tb1qpayer123456789abcdefghijklmnopqrstuvwxy',
      toAddress: settlingInvoice.depositAddresses.btc,
      amount: '14166667', // 0.1417 BTC in satoshis
      status: 'CONFIRMED',
      confirmations: 6,
      confirmedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      exchangeRate: 60000,
      usdValueCents: 850000,
    });

    // Create Settlement record (in progress - Mode B)
    await Settlement.create({
      paymentId: btcPaymentSettling._id,
      businessId: business._id,
      invoiceId: settlingInvoice._id,
      asset: 'BTC',
      amount: '14166667', // 0.1417 BTC in satoshis
      amountUsd: 850000, // USD cents
      toAddress: DEMO_ADDRESSES.btc,
      status: 'PROCESSING',
    });

    // ===== Invoice 7: CASHED_OUT - SOL → USD (Nessie deposit pending) =====
    const cashedOutInvoice = await createInvoice({
      clientName: clients[0].name,
      clientEmail: clients[0].email,
      items: [
        { description: 'Monthly Maintenance', quantity: 3, unitPrice: 100000, amount: 300000 },
      ],
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      status: 'CASHED_OUT',
      paymentOptions: { btc: false, eth: false, sol: true },
      depositAddresses: {
        sol: '3PQk2Jx6Ds74maemT9xwrLKoxtzxUmUjvVaFx7kg8GkP',
      },
      settlementTarget: 'USD',
      conversionMode: 'MODE_A',
      autoCashout: true,
      lockedQuote: {
        paymentChain: 'SOL',
        paymentAmount: '20',
        paymentAmountUsd: 300000,
        rates: { btc: 60000, eth: 3000, sol: 150 },
        lockedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
      },
      paymentTxHash: 'sol_txhash_cashedout_abcdef123456789ghijklmnopqrstuv',
      paidAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
      convertedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
      cashedOutAt: new Date(Date.now() - 16 * 60 * 60 * 1000),
      nessieTransferId: 'nessie_transfer_pending_xyz789',
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    // Create records for cashed out invoice
    const solPaymentCashedOut = await Payment.create({
      invoiceId: cashedOutInvoice._id,
      businessId: business._id,
      chain: 'SOL',
      txHash: 'sol_txhash_cashedout_abcdef123456789ghijklmnopqrstuv',
      fromAddress: 'PayerSolanaAddressCashedOut123456789abcdefgh',
      toAddress: cashedOutInvoice.depositAddresses.sol,
      amount: '20000000000', // 20 SOL in lamports
      status: 'CONFIRMED',
      confirmations: 32,
      confirmedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
      exchangeRate: 150,
      usdValueCents: 300000,
    });

    const conversionCashedOut = await Conversion.create({
      invoiceId: cashedOutInvoice._id,
      paymentId: solPaymentCashedOut._id,
      businessId: business._id,
      fromAsset: 'SOL',
      toAsset: 'USD',
      fromAmount: '20',
      toAmount: '3000',
      fromAmountUsd: 300000,
      toAmountUsd: 300000,
      route: 'VIA_STABLE',
      pivotAsset: 'USD',
      rates: { btc: 60000, eth: 3000, sol: 150 },
      status: 'COMPLETED',
      txHash: 'sim_conversion_cashedout_123456789abcdef',
      completedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
    });

    await FiatSettlement.create({
      invoiceId: cashedOutInvoice._id,
      businessId: business._id,
      bankAccountId: 'pending_real_integration',
      amountCents: 300000,
      bankTransferId: 'seed_transfer_pending_xyz789',
      status: 'COMPLETED',
      completedAt: new Date(),
    });

    // ===== Invoice 8: COMPLETE - Full pipeline done (ETH → USD) =====
    const completeInvoice = await createInvoice({
      clientName: clients[1].name,
      clientEmail: clients[1].email,
      items: [
        { description: 'E-commerce Platform', quantity: 1, unitPrice: 1500000, amount: 1500000 },
        { description: 'Payment Gateway Integration', quantity: 1, unitPrice: 200000, amount: 200000 },
      ],
      dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      status: 'COMPLETE',
      paymentOptions: { btc: true, eth: true, sol: true },
      depositAddresses: {
        btc: 'tb1qcomplete123456789abcdefghijklmnopqrstuv',
        eth: '0xComplete1234567890AbCdEf1234567890aBcDeF',
        sol: 'CompleteSolAddress123456789abcdefghijklmnopq',
      },
      settlementTarget: 'USD',
      conversionMode: 'MODE_A',
      autoCashout: true,
      lockedQuote: {
        paymentChain: 'ETH',
        paymentAmount: '0.567',
        paymentAmountUsd: 170000,
        rates: { btc: 60000, eth: 3000, sol: 150 },
        lockedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
      },
      paymentTxHash: '0xeth_complete_transaction_hash_abcdef123456789',
      conversionTxHash: 'sim_conversion_complete_xyz789',
      nessieTransferId: 'nessie_transfer_complete_final_123',
      paidAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      convertedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
      cashedOutAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
      completedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
      sentAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    });

    // Create all records for complete invoice
    const ethPaymentComplete = await Payment.create({
      invoiceId: completeInvoice._id,
      businessId: business._id,
      chain: 'ETH',
      txHash: '0xeth_complete_transaction_hash_abcdef123456789',
      fromAddress: '0xPayerComplete123456789abcdef1234567890',
      toAddress: completeInvoice.depositAddresses.eth,
      amount: '566666666666666666666', // ~0.567 ETH in wei
      status: 'CONFIRMED',
      confirmations: 35,
      confirmedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      exchangeRate: 3000,
      usdValueCents: 170000,
    });

    const conversionComplete = await Conversion.create({
      invoiceId: completeInvoice._id,
      paymentId: ethPaymentComplete._id,
      businessId: business._id,
      fromAsset: 'ETH',
      toAsset: 'USD',
      fromAmount: '0.567',
      toAmount: '1700',
      fromAmountUsd: 170000,
      toAmountUsd: 170000,
      route: 'VIA_STABLE',
      pivotAsset: 'USD',
      rates: { btc: 60000, eth: 3000, sol: 150 },
      status: 'COMPLETED',
      txHash: 'sim_conversion_complete_xyz789',
      completedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
    });

    await FiatSettlement.create({
      invoiceId: completeInvoice._id,
      businessId: business._id,
      bankAccountId: 'pending_real_integration',
      amountCents: 170000,
      bankTransferId: 'seed_transfer_complete_final_123',
      status: 'COMPLETED',
      completedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
    });

    // ===== Invoice 9: COMPLETE - SOL → SOL (Mode B, no conversion) =====
    const completeModeBInvoice = await createInvoice({
      clientName: clients[3].name,
      clientEmail: clients[3].email,
      items: [
        { description: 'NFT Collection Development', quantity: 1, unitPrice: 600000, amount: 600000 },
      ],
      dueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      status: 'COMPLETE',
      paymentOptions: { btc: false, eth: false, sol: true },
      depositAddresses: {
        sol: 'ModeBSolAddress123456789abcdefghijklmnopqrs',
      },
      settlementTarget: 'SOL',
      conversionMode: 'MODE_B',
      lockedQuote: {
        paymentChain: 'SOL',
        paymentAmount: '40',
        paymentAmountUsd: 600000,
        rates: { btc: 60000, eth: 3000, sol: 150 },
        lockedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
      },
      paymentTxHash: 'sol_modeB_complete_txhash_abcdef123456789',
      settlementTxHash: 'sol_settlement_modeB_xyz789abcdef123456',
      paidAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      settledAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
      completedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
      sentAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
      notes: 'Mode B - Received SOL directly, no conversion',
    });

    const solPaymentModeB = await Payment.create({
      invoiceId: completeModeBInvoice._id,
      businessId: business._id,
      chain: 'SOL',
      txHash: 'sol_modeB_complete_txhash_abcdef123456789',
      fromAddress: 'PayerSolanaModeBAddress123456789abcdefghij',
      toAddress: completeModeBInvoice.depositAddresses.sol,
      amount: '40000000000', // 40 SOL in lamports
      status: 'CONFIRMED',
      confirmations: 32,
      confirmedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      exchangeRate: 150,
      usdValueCents: 600000,
    });

    await Settlement.create({
      paymentId: solPaymentModeB._id,
      businessId: business._id,
      invoiceId: completeModeBInvoice._id,
      asset: 'SOL',
      amount: '40000000000', // 40 SOL in lamports
      amountUsd: 600000, // USD cents
      toAddress: DEMO_ADDRESSES.sol,
      txHash: 'sol_settlement_modeB_xyz789abcdef123456',
      status: 'COMPLETED',
      completedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
    });

    // ===== Invoice 10: CANCELLED =====
    await createInvoice({
      clientName: 'Cancelled Project LLC',
      clientEmail: 'cancelled@example.com',
      items: [
        { description: 'Project Cancelled', quantity: 1, unitPrice: 200000, amount: 200000 },
      ],
      dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      status: 'CANCELLED',
      paymentOptions: { btc: true, eth: true, sol: true },
      settlementTarget: 'USD',
      conversionMode: 'MODE_A',
      notes: 'Client cancelled the project',
    });

    console.log('\n========================================');
    console.log('Nova Multi-Chain Seed completed!');
    console.log('========================================\n');
    console.log('Demo Credentials:');
    console.log(`  Email: demo@nova.app`);
    console.log(`  Password: ${DEMO_PASSWORD}`);
    console.log('\nCreated:');
    console.log('  - 1 business with multi-chain config');
    console.log('  - 1 user (demo@nova.app)');
    console.log('  - 10 invoices in various states:');
    console.log('      1. DRAFT - Multi-chain enabled');
    console.log('      2. SENT - All chains enabled');
    console.log('      3. SENT - BTC only (Mode B)');
    console.log('      4. PAID_DETECTED - ETH payment');
    console.log('      5. CONVERTING - SOL -> BTC');
    console.log('      6. SETTLING - BTC -> BTC (Mode B)');
    console.log('      7. CASHED_OUT - SOL -> USD');
    console.log('      8. COMPLETE - ETH -> USD');
    console.log('      9. COMPLETE - SOL -> SOL (Mode B)');
    console.log('     10. CANCELLED');
    console.log('  - Multiple Payment records');
    console.log('  - Multiple Conversion records');
    console.log('  - Multiple FiatSettlement records');
    console.log('  - Multiple Settlement records');
    console.log('\nPayout Addresses (testnet):');
    console.log(`  BTC: ${DEMO_ADDRESSES.btc}`);
    console.log(`  ETH: ${DEMO_ADDRESSES.eth}`);
    console.log(`  SOL: ${DEMO_ADDRESSES.sol}`);
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
