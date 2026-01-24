/**
 * Seed script for Mercury demo data
 *
 * Usage: node src/scripts/seed.js
 *
 * Creates:
 * - 1 demo business (Acme Web Services)
 * - 1 demo user (demo@mercury.app / password123)
 * - 8 sample invoices in various states
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');
const { Business, User, Invoice, Payment, Settlement } = require('../models');

const DEMO_PASSWORD = 'password123';

const seedData = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data (be careful in production!)
    console.log('Clearing existing data...');
    await Promise.all([
      Business.deleteMany({}),
      User.deleteMany({}),
      Invoice.deleteMany({}),
      Payment.deleteMany({}),
      Settlement.deleteMany({}),
    ]);

    // Create demo business
    // Note: This is a demo devnet wallet address for testing
    // In production, businesses would provide their own wallet address
    console.log('Creating demo business...');
    const business = await Business.create({
      name: 'Acme Web Services',
      email: 'demo@mercury.app',
      invoicePrefix: 'INV-',
      invoiceCounter: 0,
      defaultCurrency: 'USD',
      // Demo Solana devnet wallet - valid address for testing
      solanaWalletAddress: 'AtWKwhUsdVHYgrNBHyTh1GHoien8nHYwoYuEC7Jka17B',
      nessieAccountId: 'demo-nessie-account',
    });

    // Create demo user
    console.log('Creating demo user...');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const user = await User.create({
      businessId: business._id,
      email: 'demo@mercury.app',
      passwordHash,
      name: 'Demo User',
      role: 'owner',
    });

    // Create sample invoices
    console.log('Creating sample invoices...');

    // Helper to create invoices
    const createInvoice = async (data) => {
      business.invoiceCounter += 1;
      await business.save();
      const invoiceNumber = `${business.invoicePrefix}${String(business.invoiceCounter).padStart(4, '0')}`;

      return Invoice.create({
        businessId: business._id,
        invoiceNumber,
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
    ];

    // Invoice 1: Draft
    await createInvoice({
      clientName: clients[0].name,
      clientEmail: clients[0].email,
      items: [
        { description: 'Website Redesign', quantity: 1, unitPrice: 500000, amount: 500000 },
        { description: 'SEO Optimization', quantity: 1, unitPrice: 150000, amount: 150000 },
      ],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'DRAFT',
      notes: 'Draft invoice for upcoming project',
    });

    // Invoice 2: Sent
    const sentInvoice = await createInvoice({
      clientName: clients[1].name,
      clientEmail: clients[1].email,
      items: [
        { description: 'Logo Design Package', quantity: 1, unitPrice: 250000, amount: 250000 },
        { description: 'Brand Guidelines', quantity: 1, unitPrice: 100000, amount: 100000 },
      ],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      status: 'SENT',
      paymentToken: 'SOL',
      recipientAddress: business.solanaWalletAddress,
      referencePublicKey: '5vefVHLDfYSH1vzVQ4HMJWjNhAE7ud9FpuvHaR3mT4o3',
      solanaPayUrl: 'solana:' + business.solanaWalletAddress + '?amount=2.33',
      paymentAmount: 2.33,
      paymentAmountSmallestUnit: 2333333333,
      issueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    });

    // Invoice 3: Pending (payment detected, awaiting confirmation)
    await createInvoice({
      clientName: clients[2].name,
      clientEmail: clients[2].email,
      items: [
        { description: 'Data Migration Service', quantity: 1, unitPrice: 300000, amount: 300000 },
        { description: 'API Integration', quantity: 2, unitPrice: 75000, amount: 150000 },
      ],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'PENDING',
      paymentToken: 'SOL',
      recipientAddress: business.solanaWalletAddress,
      referencePublicKey: 'Bn9JdPoovmSvMnEv8i1H41bNfzUbJ75KD3UBW3pqywdg',
      solanaPayUrl: 'solana:' + business.solanaWalletAddress + '?amount=3.0',
      paymentAmount: 3.0,
      paymentAmountSmallestUnit: 3000000000,
      issueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });

    // Invoice 4: Paid (confirmed, not yet settled)
    const paidInvoice = await createInvoice({
      clientName: clients[3].name,
      clientEmail: clients[3].email,
      items: [
        { description: 'Solar Panel Website', quantity: 1, unitPrice: 450000, amount: 450000 },
      ],
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      status: 'PAID',
      paymentToken: 'SOL',
      recipientAddress: business.solanaWalletAddress,
      referencePublicKey: 'HgWFDGqxE2RAqd4C7kd4GueGEhcwejVdZCAupULLJfaF',
      solanaPayUrl: 'solana:' + business.solanaWalletAddress + '?amount=3.0',
      paymentAmount: 3.0,
      paymentAmountSmallestUnit: 3000000000,
      transactionSignature: 'demo_signature_1234567890abcdef',
      issueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    // Invoice 5: Settled
    const settledInvoice = await createInvoice({
      clientName: clients[4].name,
      clientEmail: clients[4].email,
      items: [
        { description: 'Mobile App Development', quantity: 1, unitPrice: 800000, amount: 800000 },
        { description: 'App Store Submission', quantity: 1, unitPrice: 50000, amount: 50000 },
      ],
      dueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      status: 'SETTLED',
      paymentToken: 'SOL',
      recipientAddress: business.solanaWalletAddress,
      referencePublicKey: 'LuxtfbmDtHhisf8yrakDhxMXGygGcJcxNUmRE6XgBeY',
      solanaPayUrl: 'solana:' + business.solanaWalletAddress + '?amount=5.67',
      paymentAmount: 5.67,
      paymentAmountSmallestUnit: 5666666667,
      transactionSignature: 'demo_signature_settled_abcdef123456',
      issueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      paidAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
      settledAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    });

    // Invoice 6: Another settled one (for revenue stats)
    await createInvoice({
      clientName: clients[0].name,
      clientEmail: clients[0].email,
      items: [
        { description: 'Monthly Maintenance', quantity: 1, unitPrice: 100000, amount: 100000 },
      ],
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      status: 'SETTLED',
      paymentToken: 'SOL',
      recipientAddress: business.solanaWalletAddress,
      referencePublicKey: '3PQk2Jx6Ds74maemT9xwrLKoxtzxUmUjvVaFx7kg8GkP',
      solanaPayUrl: 'solana:' + business.solanaWalletAddress + '?amount=0.67',
      paymentAmount: 0.67,
      paymentAmountSmallestUnit: 666666667,
      transactionSignature: 'demo_signature_settled2_xyz789',
      issueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      paidAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
      settledAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    });

    // Invoice 7: Cancelled
    await createInvoice({
      clientName: 'Cancelled Client LLC',
      clientEmail: 'old@cancelled.com',
      items: [
        { description: 'Project Cancelled', quantity: 1, unitPrice: 200000, amount: 200000 },
      ],
      dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      status: 'CANCELLED',
      notes: 'Client cancelled the project',
    });

    // Invoice 8: Overdue (sent but past due)
    await createInvoice({
      clientName: clients[2].name,
      clientEmail: clients[2].email,
      items: [
        { description: 'Consultation Services', quantity: 5, unitPrice: 30000, amount: 150000 },
      ],
      dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days overdue
      status: 'SENT',
      paymentToken: 'SOL',
      recipientAddress: business.solanaWalletAddress,
      referencePublicKey: '2o84BrFPh3ZmTLPoqqhffUZdrJNXr5e6HmJehhSJ5SR1',
      solanaPayUrl: 'solana:' + business.solanaWalletAddress + '?amount=1.0',
      paymentAmount: 1.0,
      paymentAmountSmallestUnit: 1000000000,
      issueDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    });

    // Create sample payment for paid invoice
    console.log('Creating sample payment...');
    const payment = await Payment.create({
      invoiceId: paidInvoice._id,
      businessId: business._id,
      transactionSignature: paidInvoice.transactionSignature,
      fromAddress: 'PayerWa11et123456789abcdefghijklmnopqrstu',
      toAddress: paidInvoice.recipientAddress,
      amountLamports: paidInvoice.paymentAmountSmallestUnit,
      status: 'CONFIRMED',
      confirmations: 32,
      confirmedAt: paidInvoice.paidAt,
      solUsdRate: 150,
      usdValueCents: 450000,
    });

    // Create sample settlement for settled invoice
    console.log('Creating sample settlement...');
    await Settlement.create({
      paymentId: payment._id,
      businessId: business._id,
      invoiceId: settledInvoice._id,
      nessieTransferId: 'nessie_transfer_demo_123',
      fromAccountId: 'mercury_holding_account',
      toAccountId: business.nessieAccountId,
      amountCents: 850000,
      status: 'COMPLETED',
      completedAt: settledInvoice.settledAt,
      feeCents: 0,
      netAmountCents: 850000,
    });

    console.log('\n========================================');
    console.log('Seed completed successfully!');
    console.log('========================================\n');
    console.log('Demo Credentials:');
    console.log(`  Email: demo@mercury.app`);
    console.log(`  Password: ${DEMO_PASSWORD}`);
    console.log('\nCreated:');
    console.log('  - 1 business (Acme Web Services)');
    console.log('  - 1 user (demo@mercury.app)');
    console.log('  - 8 invoices (various states)');
    console.log('  - 1 payment record');
    console.log('  - 1 settlement record');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
