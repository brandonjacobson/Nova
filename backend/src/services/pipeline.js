/**
 * Payment Pipeline Orchestrator
 *
 * Orchestrates the full payment flow:
 * Payment Detected → Convert (if needed) → Settle → Cashout (if USD)
 *
 * Supports:
 * - Mode A: Convert & settle (cross-chain or to USD)
 * - Mode B: Receive in-kind (same asset, no conversion)
 * - USD settlement with automatic Nessie cashout
 * - Configurable demo delays for presentation
 */

const Invoice = require('../models/Invoice');
const Business = require('../models/Business');
const Payment = require('../models/Payment');
const config = require('../config/env');
const chains = require('./chains');
const { getNetwork, isCryptoAsset } = require('../config/assets');
const { attachWalletToPayment } = require('./paymentWalletService');
const { isConversionNeeded, executeConversion } = require('./conversion');
const { executeSettlement, getPayoutAddress } = require('./settlement');
const { executeFiatSettlement, getFiatSettlementByInvoice } = require('./fiatSettlement');

// ========== PIPELINE ORCHESTRATION ==========

/**
 * Process a detected payment through the full pipeline
 *
 * Flow:
 * 1. Mark as PAID_DETECTED, record payment details
 * 2. If Mode A + crypto target: Convert to settlement asset
 * 3. If crypto settlement: Execute settlement to merchant address
 * 4. If USD settlement: Execute Nessie cashout
 * 5. Mark as COMPLETE
 *
 * @param {string} invoiceId - Invoice ID
 * @param {object} paymentDetails
 * @param {'BTC'|'ETH'|'SOL'} paymentDetails.chain - Chain payment was received on
 * @param {string} paymentDetails.txHash - Transaction hash
 * @param {string} paymentDetails.amount - Amount in native units
 * @returns {Promise<Invoice>} - Updated invoice
 */
async function processPayment(invoiceId, paymentDetails) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  const business = await Business.findById(invoice.businessId);
  if (!business) {
    throw new Error(`Business not found: ${invoice.businessId}`);
  }

  const paymentAsset = paymentDetails.assetSymbol || paymentDetails.chain;
  const paymentNetwork = getNetwork(paymentAsset);
  // ========== STAGE 1: PAYMENT DETECTED ==========

  const usdValueCents = chains.chainAmountToUsd(paymentDetails.chain, paymentDetails.amount);
  const toAddress = (() => {
    if (paymentDetails.chain === 'BTC') return invoice.depositAddresses?.btc || 'unknown';
    if (paymentDetails.chain === 'ETH') return invoice.depositAddresses?.eth || 'unknown';
    return invoice.depositAddresses?.sol || 'unknown';
  })();

  // Create Payment record
   const payment = await Payment.create({
    invoiceId,
    businessId: invoice.businessId,
    chain: paymentNetwork,          // network (BTC / ETH / SOL)
    assetSymbol: paymentAsset,      // asset (BTC / ETH / SOL / USDC / USDT)
    txHash: paymentDetails.txHash,
    fromAddress: paymentDetails.fromAddress || 'simulated',
    toAddress,
    amount: paymentDetails.amount,  // smallest units of paymentAsset
    status: 'CONFIRMED',
    confirmations: paymentDetails.confirmations || 1,
    confirmedAt: new Date(),
    exchangeRate: invoice.lockedQuote?.rates?.[paymentAsset.toLowerCase()] || null,
    usdValueCents,
  });


  // Create WalletTransaction + update WalletBalance
  await attachWalletToPayment(payment._id);

  // Update invoice status
  invoice.status = 'PAID_DETECTED';
  invoice.paymentTxHash = paymentDetails.txHash;
  invoice.paidAt = new Date();

  // Lock the quote with payment details
  invoice.lockedQuote = {
    ...invoice.lockedQuote,
    paymentChain: paymentNetwork,
    paymentAsset,
    paymentAmount: paymentDetails.amount,
    paymentAmountUsd: usdValueCents,
    lockedAt: new Date(),
  };

  await invoice.save();
  await demoDelay('PAID_DETECTED');

    // ========== STAGE 2: CONVERSION (if needed) ==========

  const invoiceTarget = invoice.settlementTarget;   // BTC / ETH / SOL / USDC / USDT / USD
  const mode = invoice.conversionMode || 'MODE_A';  // default to MODE_A if missing

  let settlementAsset;
  let settlementAmount = paymentDetails.amount;
  let conversionId = null;

  if (mode === 'MODE_B') {
    // Receive in-kind: keep what was paid
    settlementAsset = paymentAsset;
  } else {
    // MODE_A: convert to target asset
    settlementAsset = invoiceTarget;
  }

  const needsConversion =
    isCryptoAsset(settlementAsset) &&
    settlementAsset !== paymentAsset;

  if (needsConversion) {
    // Crypto → crypto conversion (e.g. ETH → USDC)
    invoice.status = 'CONVERTING';
    await invoice.save();
    await demoDelay('CONVERTING');

    const conversion = await executeConversion({
      invoiceId,
      paymentId: payment._id,
      businessId: invoice.businessId,
      fromAsset: paymentAsset,
      toAsset: settlementAsset,
      fromAmount: paymentDetails.amount,
      rates: invoice.lockedQuote?.rates,
    });

    conversionId = conversion._id;
    settlementAmount = conversion.toAmount;
    invoice.conversionTxHash = conversion.txHash;
    invoice.convertedAt = new Date();
    await invoice.save();
  } else if (settlementAsset === 'USD') {
    // Conceptual "conversion" to fiat, FX handled by bank
    invoice.status = 'CONVERTING';
    await invoice.save();
    await demoDelay('CONVERTING');
  }

  // ========== STAGE 3: SETTLEMENT ==========

  if (isCryptoAsset(settlementAsset)) {
    // Crypto settlement: BTC, ETH, SOL, USDC, USDT

    invoice.status = 'SETTLING';
    await invoice.save();
    await demoDelay('SETTLING');

    const payoutAddress = getPayoutAddress(business, settlementAsset);
    if (!payoutAddress) {
      invoice.status = 'FAILED';
      await invoice.save();
      throw new Error(`No ${settlementAsset} payout address configured for business`);
    }

    const settlement = await executeSettlement({
      invoiceId,
      paymentId: payment._id,
      conversionId,
      businessId: invoice.businessId,
      asset: settlementAsset,
      amount: settlementAmount,
      toAddress: payoutAddress,
    });

    invoice.settlementTxHash = settlement.txHash;
    invoice.settledAt = new Date();
    invoice.status = 'COMPLETE';
    invoice.completedAt = new Date();
    await invoice.save();
  } else if (settlementAsset === 'USD') {
    // Fiat settlement (simulated until real bank integration)
    const usdCents = invoice.total;
    const bankAccountId = business.bankAccountId || 'pending_real_integration';

    invoice.status = 'SETTLING';
    await invoice.save();
    await demoDelay('SETTLING');

    const fiatSettlement = await executeFiatSettlement({
      invoiceId,
      businessId: invoice.businessId,
      bankAccountId,
      amountCents: usdCents,
      description: `Nova Invoice #${invoice.invoiceNumber}`,
    });

    invoice.fiatSettlementId = fiatSettlement._id;
    invoice.cashedOutAt = fiatSettlement.completedAt || new Date();
    invoice.status = 'COMPLETE';
    invoice.completedAt = new Date();
    await invoice.save();
  } else {
    invoice.status = 'FAILED';
    await invoice.save();
    throw new Error(`Unsupported settlement asset: ${settlementAsset}`);
  }

  return Invoice.findById(invoiceId);
}

/**
 * Demo delay helper - pauses execution for visual feedback during demos
 * Only delays if DEMO_MODE is enabled in config
 *
 * @param {string} stage - Current pipeline stage (for logging)
 */
async function demoDelay(stage) {
  if (config.demoMode && config.demoDelayMs > 0) {
    console.log(`[DEMO] Stage ${stage} - waiting ${config.demoDelayMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, config.demoDelayMs));
  }
}

// ========== PIPELINE STATUS ==========

/**
 * Get current pipeline status for an invoice
 * Includes all related records (payment, conversion, settlement, cashout)
 *
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<object>}
 */
async function getPipelineStatus(invoiceId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  const [payment, conversion, settlement, cashout] = await Promise.all([
    Payment.findOne({ invoiceId }).sort({ createdAt: -1 }),
    require('./conversion').getConversionByInvoice(invoiceId),
    require('./settlement').getSettlementByInvoice(invoiceId),
    getFiatSettlementByInvoice(invoiceId),
  ]);

  return {
    invoiceId,
    status: invoice.status,
    settlementTarget: invoice.settlementTarget,
    conversionMode: invoice.conversionMode,
    stages: {
      payment: payment
        ? {
            status: payment.status,
            chain: payment.chain,
            amount: payment.amount,
            txHash: payment.txHash,
            timestamp: payment.confirmedAt,
          }
        : null,
      conversion: conversion
        ? {
            status: conversion.status,
            from: conversion.fromAsset,
            to: conversion.toAsset,
            fromAmount: conversion.fromAmount,
            toAmount: conversion.toAmount,
            txHash: conversion.txHash,
            timestamp: conversion.completedAt,
          }
        : null,
      settlement: settlement
        ? {
            status: settlement.status,
            asset: settlement.asset,
            amount: settlement.amount,
            toAddress: settlement.toAddress,
            txHash: settlement.txHash,
            timestamp: settlement.completedAt,
          }
        : null,
      fiatSettlement: cashout
        ? {
            status: cashout.status,
            amountCents: cashout.amountCents,
            bankTransferId: cashout.bankTransferId,
            timestamp: cashout.completedAt,
          }
        : null,
    },
    timestamps: {
      created: invoice.createdAt,
      sent: invoice.sentAt,
      paid: invoice.paidAt,
      converted: invoice.convertedAt,
      settled: invoice.settledAt,
      cashedOut: invoice.cashedOutAt,
      completed: invoice.completedAt,
    },
  };
}

/**
 * Get pipeline summary for display
 *
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<object>}
 */
async function getPipelineSummary(invoiceId) {
  const status = await getPipelineStatus(invoiceId);

  const steps = [];

  // Payment step
  if (status.stages.payment) {
    const p = status.stages.payment;
    steps.push({
      step: 'Payment Received',
      status: 'complete',
      detail: `${chains.formatAmount(p.chain, p.amount)}`,
      txHash: p.txHash,
      timestamp: p.timestamp,
    });
  }

  // Conversion step (if applicable)
  if (status.stages.conversion) {
    const c = status.stages.conversion;
    steps.push({
      step: 'Converted',
      status: c.status === 'COMPLETED' ? 'complete' : c.status.toLowerCase(),
      detail: `${c.from} → ${c.to}`,
      txHash: c.txHash,
      timestamp: c.timestamp,
    });
  }

  // Settlement step (if applicable)
  if (status.stages.settlement) {
    const s = status.stages.settlement;
    steps.push({
      step: 'Settled',
      status: s.status === 'COMPLETED' ? 'complete' : s.status.toLowerCase(),
      detail: `${chains.formatAmount(s.asset, s.amount)} sent`,
      txHash: s.txHash,
      timestamp: s.timestamp,
    });
  }

  // Cashout step (if applicable)
  if (status.stages.fiatSettlement) {
    const f = status.stages.fiatSettlement;
    steps.push({
      step: 'Fiat Settled',
      status: f.status === 'COMPLETED' ? 'complete' : f.status.toLowerCase(),
      detail: `$${(f.amountCents / 100).toFixed(2)} sent to bank`,
      bankTransferId: f.bankTransferId,
      timestamp: f.timestamp,
    });
  }

  return {
    invoiceId,
    overallStatus: status.status,
    steps,
    isComplete: status.status === 'COMPLETE',
  };
}

// ========== PAYMENT DETECTION ==========

/**
 * Check for payments on all enabled chains for an invoice
 * If payment found, processes it through the pipeline
 *
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<{ found: boolean, invoice: Invoice }>}
 */
async function checkAndProcessPayment(invoiceId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  // Only check if invoice is in a state expecting payment
  if (!['SENT', 'PENDING'].includes(invoice.status)) {
    return { found: false, invoice, reason: `Invoice status is ${invoice.status}` };
  }

  // Check each enabled chain
  const chainsToCheck = [];
  if (invoice.paymentOptions?.allowBtc && invoice.depositAddresses?.btc) {
    chainsToCheck.push({ chain: 'BTC', address: invoice.depositAddresses.btc });
  }
  if (invoice.paymentOptions?.allowEth && invoice.depositAddresses?.eth) {
    chainsToCheck.push({ chain: 'ETH', address: invoice.depositAddresses.eth });
  }
  if (invoice.paymentOptions?.allowSol && invoice.referencePublicKey) {
    chainsToCheck.push({ chain: 'SOL', address: invoice.referencePublicKey });
  }

  // Calculate expected amounts
  const rates = invoice.lockedQuote?.rates || chains.getRates();

  for (const { chain, address } of chainsToCheck) {
    const expectedAmount = chains.usdToChainAmount(chain, invoice.total);

    const result = await chains.checkPayment(chain, address, expectedAmount);

    if (result.found) {
      // Payment detected! Process through pipeline
      const updatedInvoice = await processPayment(invoiceId, {
        chain,
        assetSymbol: chain,
        txHash: result.txHash,
        amount: result.amount || expectedAmount,
      });

      return { found: true, invoice: updatedInvoice, chain };
    }
  }

  return { found: false, invoice };
}

module.exports = {
  // Core pipeline
  processPayment,
  demoDelay,

  // Status
  getPipelineStatus,
  getPipelineSummary,

  // Payment detection
  checkAndProcessPayment,
};
