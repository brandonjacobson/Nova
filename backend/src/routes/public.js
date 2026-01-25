/**
 * Public Routes - No authentication required
 *
 * Used for payment pages that clients access.
 * Supports multi-chain payments (BTC, ETH, SOL).
 */

const express = require('express');
const router = express.Router();
const { Invoice, Business } = require('../models');
const { solana, quote, pipeline, chains } = require('../services');

/**
 * GET /api/public/invoice/:id - Get invoice for payment page
 * Returns invoice data with all chain deposit addresses and payment amounts
 */
router.get('/invoice/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Get business name for display
    const business = await Business.findById(invoice.businessId);

    // Get or refresh quote
    let invoiceQuote = null;
    let paymentAmounts = null;
    let formattedAmounts = null;

    if (invoice.status === 'SENT' || invoice.status === 'PENDING') {
      try {
        invoiceQuote = await quote.getQuote(invoice._id);
        paymentAmounts = quote.calculatePaymentAmounts(invoice.total, invoiceQuote.rates);
        formattedAmounts = quote.calculateFormattedAmounts(invoice.total, invoiceQuote.rates);
      } catch (err) {
        console.warn('Failed to get quote:', err.message);
        // Use stored quote if available
        if (invoice.lockedQuote?.rates) {
          invoiceQuote = invoice.lockedQuote;
          paymentAmounts = quote.calculatePaymentAmounts(invoice.total, invoice.lockedQuote.rates);
          formattedAmounts = quote.calculateFormattedAmounts(invoice.total, invoice.lockedQuote.rates);
        }
      }
    }

    // Determine payment status
    const isPaid = ['PAID_DETECTED', 'CONVERTING', 'SETTLING', 'CASHED_OUT', 'COMPLETE'].includes(
      invoice.status
    );
    const isComplete = invoice.status === 'COMPLETE';
    const isCancelled = invoice.status === 'CANCELLED';
    const isPending = invoice.status === 'SENT' || invoice.status === 'PENDING';

    // Build response
    const responseData = {
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      businessName: business?.name || 'Unknown Business',
      clientName: invoice.clientName,
      items: invoice.items,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      formattedTotal: invoice.formattedTotal,
      dueDate: invoice.dueDate,
      status: invoice.status,

      // Multi-chain payment options
      paymentOptions: invoice.paymentOptions,
      depositAddresses: invoice.depositAddresses,
      settlementTarget: invoice.settlementTarget,

      // Payment amounts for each chain
      paymentAmounts,
      formattedAmounts,

      // Quote info
      quote: invoiceQuote
        ? {
            rates: invoiceQuote.rates,
            lockedAt: invoiceQuote.lockedAt,
            expiresAt: invoiceQuote.expiresAt,
            isValid: quote.isQuoteValid(invoiceQuote),
            secondsRemaining: quote.getQuoteTimeRemaining(invoiceQuote),
          }
        : null,

      // Solana Pay URL (for mobile wallets)
      solanaPayUrl: invoice.solanaPayUrl,

      // Status flags
      isPaid,
      isComplete,
      isCancelled,
      isPending,

      // Transaction info (if paid)
      paymentTxHash: invoice.paymentTxHash,
      paymentChain: invoice.lockedQuote?.paymentChain,
    };

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Get public invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get invoice',
    });
  }
});

/**
 * GET /api/public/invoice/:id/qr - Get QR code for invoice payment
 * Returns PNG image of QR code for Solana Pay
 */
router.get('/invoice/:id/qr', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    if (!invoice.solanaPayUrl) {
      return res.status(400).json({
        success: false,
        error: 'Invoice has no Solana Pay URL. It may not have been sent yet or SOL is not enabled.',
      });
    }

    // Generate QR code as PNG buffer
    const qrBuffer = await solana.generateQRCodeBuffer(invoice.solanaPayUrl, {
      width: parseInt(req.query.size) || 400,
    });

    // Return as PNG image
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.send(qrBuffer);
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code',
    });
  }
});

/**
 * GET /api/public/invoice/:id/qr-data - Get QR code as base64 data URL
 */
router.get('/invoice/:id/qr-data', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    if (!invoice.solanaPayUrl) {
      return res.status(400).json({
        success: false,
        error: 'Invoice has no Solana Pay URL',
      });
    }

    // Generate QR code as data URL
    const qrDataUrl = await solana.generateQRCode(invoice.solanaPayUrl, {
      width: parseInt(req.query.size) || 400,
    });

    res.json({
      success: true,
      data: {
        qrCode: qrDataUrl,
        solanaPayUrl: invoice.solanaPayUrl,
      },
    });
  } catch (error) {
    console.error('Generate QR data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code',
    });
  }
});

/**
 * POST /api/public/invoice/:id/check-payment - Check payment status (public)
 * Checks all enabled chains and triggers pipeline if payment found
 */
router.post('/invoice/:id/check-payment', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // If already paid/processed, return current status
    if (
      ['PAID_DETECTED', 'CONVERTING', 'SETTLING', 'CASHED_OUT', 'COMPLETE'].includes(invoice.status)
    ) {
      const pipelineSummary = await pipeline.getPipelineSummary(invoice._id);

      return res.json({
        success: true,
        data: {
          status: invoice.status,
          paid: true,
          complete: invoice.status === 'COMPLETE',
          paymentChain: invoice.lockedQuote?.paymentChain,
          paymentTxHash: invoice.paymentTxHash,
          explorerUrl: invoice.paymentTxHash && invoice.lockedQuote?.paymentChain
            ? chains.getExplorerUrl(invoice.lockedQuote.paymentChain, invoice.paymentTxHash)
            : null,
          pipeline: pipelineSummary,
        },
      });
    }

    // If not in payable state
    if (invoice.status !== 'SENT' && invoice.status !== 'PENDING') {
      return res.json({
        success: true,
        data: {
          status: invoice.status,
          paid: false,
          message:
            invoice.status === 'DRAFT'
              ? 'Invoice not yet sent'
              : `Invoice is ${invoice.status.toLowerCase()}`,
        },
      });
    }

    // Check for payment and process if found
    const result = await pipeline.checkAndProcessPayment(invoice._id);

    if (result.found) {
      // Payment detected and pipeline started
      const pipelineSummary = await pipeline.getPipelineSummary(invoice._id);

      return res.json({
        success: true,
        data: {
          status: result.invoice.status,
          paid: true,
          complete: result.invoice.status === 'COMPLETE',
          paymentChain: result.chain,
          paymentTxHash: result.invoice.paymentTxHash,
          explorerUrl: chains.getExplorerUrl(result.chain, result.invoice.paymentTxHash),
          pipeline: pipelineSummary,
        },
      });
    }

    // Payment not found yet
    res.json({
      success: true,
      data: {
        status: invoice.status,
        paid: false,
      },
    });
  } catch (error) {
    console.error('Public check payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check payment',
    });
  }
});

/**
 * GET /api/public/invoice/:id/pipeline - Get pipeline status (public)
 * Returns simplified pipeline status for display on payment page
 */
router.get('/invoice/:id/pipeline', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    const pipelineSummary = await pipeline.getPipelineSummary(invoice._id);

    res.json({
      success: true,
      data: pipelineSummary,
    });
  } catch (error) {
    console.error('Get public pipeline status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pipeline status',
    });
  }
});

/**
 * GET /api/public/rates - Get current exchange rates
 * Useful for displaying estimated amounts before invoice is sent
 */
router.get('/rates', async (req, res) => {
  try {
    const rates = chains.getRates();

    res.json({
      success: true,
      data: {
        rates,
        formatted: {
          btc: `$${rates.btc.toLocaleString()} / BTC`,
          eth: `$${rates.eth.toLocaleString()} / ETH`,
          sol: `$${rates.sol.toLocaleString()} / SOL`,
        },
      },
    });
  } catch (error) {
    console.error('Get rates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rates',
    });
  }
});

module.exports = router;
