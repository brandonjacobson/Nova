/**
 * Invoice Routes
 *
 * Multi-chain invoice management with support for BTC, ETH, and SOL payments.
 * Includes payment detection, pipeline processing, and simulation for testing.
 */

const express = require('express');
const router = express.Router();
const { Invoice, Business } = require('../models');
const { authenticate } = require('../middleware/auth');
const { requireBusiness, scopedFilter } = require('../utils/businessScope');
const { chains, solana, quote, pipeline } = require('../services');
const { generateInvoicePdf } = require('../services/invoicePdf');
const { sendInvoiceEmail, isEmailConfigured } = require('../services/emailService');
const config = require('../config/env');

// All invoice routes require authentication
router.use(authenticate, requireBusiness);

/**
 * POST /api/invoices - Create new invoice
 * Supports multi-chain payment options
 */
router.post('/', async (req, res) => {
  try {
    const {
      invoiceNumber,
      clientName,
      clientEmail,
      clientAddress,
      items,
      dueDate,
      notes,
      // Multi-chain fields
      paymentOptions,
      conversionMode,
      settlementTarget,
      autoCashout,
    } = req.body;

    // Validate required fields
    if (!clientName || !items || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: clientName, items, dueDate',
      });
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items must be a non-empty array',
      });
    }

    // Get business for defaults
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found for this user',
      });
    }

    // Determine invoice number (custom or auto-generated)
    let finalInvoiceNumber;
    if (invoiceNumber !== undefined && invoiceNumber !== null) {
      const trimmed = String(invoiceNumber).trim();
      if (!trimmed) {
        return res.status(400).json({
          success: false,
          error: 'Invoice number cannot be empty or whitespace.',
        });
      }
      if (trimmed.length > 64) {
        return res.status(400).json({
          success: false,
          error: 'Invoice number is too long (max 64 characters).',
        });
      }

      // Check uniqueness per business
      const existing = await Invoice.findOne({
        businessId: req.businessId,
        invoiceNumber: trimmed,
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'An invoice with this number already exists for your business. Please choose a different invoice number.',
        });
      }

      finalInvoiceNumber = trimmed;
    } else {
      finalInvoiceNumber = await business.getNextInvoiceNumber();
    }

    // Set payment options (MVP: ETH and SOL only, no Bitcoin)
    const finalPaymentOptions = {
      allowBtc: false,
      allowEth: paymentOptions?.allowEth !== false,
      allowSol: paymentOptions?.allowSol !== false,
    };

    // Use provided settings or business defaults
    const finalConversionMode = conversionMode || business.defaultConversionMode || 'MODE_A';
    const finalSettlementTarget = settlementTarget || business.defaultSettlementTarget || 'USD';
    const finalAutoCashout = autoCashout !== undefined ? autoCashout : true;

    // Validate settlement target
    const validTargets = ['BTC', 'ETH', 'SOL', 'USD'];
    if (!validTargets.includes(finalSettlementTarget)) {
      return res.status(400).json({
        success: false,
        error: `Invalid settlement target. Must be one of: ${validTargets.join(', ')}`,
      });
    }

    // Calculate total amount
    const itemDocs = items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice,
    }));
    const total = itemDocs.reduce((sum, item) => sum + item.amount, 0);

    // Create invoice
    const invoice = await Invoice.create({
      businessId: req.businessId,
      invoiceNumber: finalInvoiceNumber,
      clientName,
      clientEmail: clientEmail || '',
      clientAddress: clientAddress || '',
      items: itemDocs,
      total,
      dueDate: new Date(dueDate),
      notes: notes || '',
      paymentOptions: finalPaymentOptions,
      conversionMode: finalConversionMode,
      settlementTarget: finalSettlementTarget,
      autoCashout: finalAutoCashout,
      status: 'DRAFT',
    });

    res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create invoice',
    });
  }
});

/**
 * GET /api/invoices - List invoices
 */
router.get('/', async (req, res) => {
  try {
    let { status, page = 1, limit = 20 } = req.query;

    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    // Build query
    const query = scopedFilter(req, {});
    if (status) {
      // Support comma-separated statuses for grouped filters
      const statuses = status.toUpperCase().split(',').map(s => s.trim());
      query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    // Get total count
    const total = await Invoice.countDocuments(query);

    // Get invoices with pagination
    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('List invoices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list invoices',
    });
  }
});

/**
 * GET /api/invoices/:id - Get invoice details
 */
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findOne(scopedFilter(req, { _id: req.params.id }));

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get invoice',
    });
  }
});

/**
 * PUT /api/invoices/:id - Update invoice (draft only)
 */
router.put('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Can only edit drafts
    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'Can only edit draft invoices',
      });
    }

    const {
      invoiceNumber,
      clientName,
      clientEmail,
      clientAddress,
      items,
      dueDate,
      notes,
      paymentOptions,
      conversionMode,
      settlementTarget,
      autoCashout,
    } = req.body;

    // Update fields
    if (invoiceNumber !== undefined) {
      const trimmed = String(invoiceNumber).trim();
      if (!trimmed) {
        return res.status(400).json({
          success: false,
          error: 'Invoice number cannot be empty or whitespace.',
        });
      }
      if (trimmed.length > 64) {
        return res.status(400).json({
          success: false,
          error: 'Invoice number is too long (max 64 characters).',
        });
      }

      if (trimmed !== invoice.invoiceNumber) {
        const existing = await Invoice.findOne({
          businessId: req.businessId,
          invoiceNumber: trimmed,
          _id: { $ne: invoice._id },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            error: 'An invoice with this number already exists for your business. Please choose a different invoice number.',
          });
        }
        invoice.invoiceNumber = trimmed;
      }
    }

    if (clientName) invoice.clientName = clientName;
    if (clientEmail !== undefined) invoice.clientEmail = clientEmail;
    if (clientAddress !== undefined) invoice.clientAddress = clientAddress;
    if (items) {
      invoice.items = items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice,
      }));
      invoice.total = invoice.items.reduce((sum, item) => sum + item.amount, 0);
    }
    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (notes !== undefined) invoice.notes = notes;
    if (paymentOptions) invoice.paymentOptions = paymentOptions;
    if (conversionMode) invoice.conversionMode = conversionMode;
    if (settlementTarget) invoice.settlementTarget = settlementTarget;
    if (autoCashout !== undefined) invoice.autoCashout = autoCashout;

    await invoice.save();

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update invoice',
    });
  }
});

/**
 * DELETE /api/invoices/:id - Delete invoice (draft only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Can only delete drafts
    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'Can only delete draft invoices',
      });
    }

    await invoice.deleteOne();

    res.json({
      success: true,
      message: 'Invoice deleted',
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete invoice',
    });
  }
});

/**
 * POST /api/invoices/:id/send - Send invoice and generate deposit addresses
 * Generates deposit addresses for all enabled chains
 */
router.post('/:id/send', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'Invoice already sent',
      });
    }

    // Get business for payout addresses
    const business = await Business.findById(req.businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found for this user',
      });
    }

    // Check that at least one payment option is enabled
    const hasPaymentOption =
      invoice.paymentOptions.allowEth ||
      invoice.paymentOptions.allowSol;

    if (!hasPaymentOption) {
      return res.status(400).json({
        success: false,
        error: 'At least one payment option (Ethereum or Solana) must be enabled',
      });
    }

    // When Solana is enabled, merchant must have a SOL payout address for real payments
    if (invoice.paymentOptions.allowSol && !business.payoutAddresses?.sol) {
      return res.status(400).json({
        success: false,
        error: 'Solana payout address is required when accepting SOL. Add it in Settings.',
      });
    }

    // Generate deposit addresses for enabled chains (MVP: no Bitcoin)
    const depositAddresses = { btc: '', eth: '', sol: '' };

    // Ethereum
    if (invoice.paymentOptions.allowEth) {
      const ethDeposit = chains.generateDepositAddress('ETH');
      depositAddresses.eth = ethDeposit.address;
    }

    // Solana (with Solana Pay URL)
    if (invoice.paymentOptions.allowSol) {
      // Need a recipient address for Solana Pay
      const solRecipient = business.payoutAddresses?.sol;

      if (solRecipient) {
        const solDeposit = chains.generateDepositAddress('SOL', {
          recipientAddress: solRecipient,
        });
        depositAddresses.sol = solRecipient; // Solana Pay sends directly to merchant

        // Store reference for payment tracking
        invoice.referencePublicKey = solDeposit.reference;

        // Create Solana Pay URL
        const paymentUrl = solana.createPaymentUrl({
          recipient: solRecipient,
          amountUsdCents: invoice.total,
          token: 'SOL',
          reference: solDeposit.reference,
          label: business.name,
          message: `Invoice ${invoice.invoiceNumber}`,
          memo: invoice.invoiceNumber,
        });
        invoice.solanaPayUrl = paymentUrl.url;
      } else {
        // No SOL payout address, generate reference-only for tracking
        const solDeposit = solana.generateDepositAddress(
          'demo-recipient' // Placeholder, payment will still be tracked by reference
        );
        invoice.referencePublicKey = solDeposit.reference;
        depositAddresses.sol = ''; // No direct deposit address
      }
    }

    // Create initial quote with current rates
    const invoiceQuote = await quote.createQuote(invoice._id);

    // Update invoice
    invoice.depositAddresses = depositAddresses;
    invoice.lockedQuote = {
      rates: invoiceQuote.rates,
      lockedAt: invoiceQuote.lockedAt,
      expiresAt: invoiceQuote.expiresAt,
    };
    invoice.status = 'SENT';
    invoice.sentAt = new Date();

    await invoice.save();

    // Calculate payment amounts for response
    const paymentAmounts = quote.calculatePaymentAmounts(invoice.total, invoiceQuote.rates);
    const formattedAmounts = quote.calculateFormattedAmounts(invoice.total, invoiceQuote.rates);

    res.json({
      success: true,
      data: {
        invoice,
        paymentAmounts,
        formattedAmounts,
        quote: {
          rates: invoiceQuote.rates,
          expiresAt: invoiceQuote.expiresAt,
        },
      },
    });
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send invoice',
    });
  }
});

/**
 * GET /api/invoices/:id/pdf - Download invoice as PDF
 */
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findOne(scopedFilter(req, { _id: req.params.id }));
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    const baseUrl = config.frontendUrl;
    const pdfBuffer = await generateInvoicePdf(invoice._id, baseUrl);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Invoice PDF error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate PDF' });
  }
});

/**
 * POST /api/invoices/:id/send-email - Email invoice to client (with optional PDF)
 * Body: { to?: string, attachPdf?: boolean } - defaults to invoice.clientEmail, attachPdf true
 */
router.post('/:id/send-email', async (req, res) => {
  try {
    const invoice = await Invoice.findOne(scopedFilter(req, { _id: req.params.id }));
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    const to = req.body.to || invoice.clientEmail;
    if (!to) {
      return res.status(400).json({ success: false, error: 'No recipient email. Set clientEmail on the invoice or pass "to" in the body.' });
    }
    const attachPdf = req.body.attachPdf !== false;

    const business = await Business.findById(invoice.businessId);
    const businessName = business?.name || 'Business';
    const baseUrl = config.frontendUrl;
    const paymentUrl = `${baseUrl.replace(/\/$/, '')}/pay/${invoice._id}`;

    let pdfBuffer = null;
    if (attachPdf) {
      try {
        pdfBuffer = await generateInvoicePdf(invoice._id, baseUrl);
      } catch (err) {
        console.warn('PDF generation failed for email:', err.message);
      }
    }

    const result = await sendInvoiceEmail({
      to,
      invoiceNumber: invoice.invoiceNumber,
      businessName,
      paymentUrl,
      pdfBuffer: pdfBuffer || undefined,
      pdfFilename: pdfBuffer ? `invoice-${invoice.invoiceNumber}.pdf` : undefined,
    });

    if (!result.sent) {
      return res.status(503).json({
        success: false,
        error: result.error || 'Email not sent',
        emailConfigured: isEmailConfigured(),
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Invoice email sent',
        to,
        attachment: !!pdfBuffer,
        messageId: result.messageId,
      },
    });
  } catch (error) {
    console.error('Send invoice email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

/**
 * POST /api/invoices/:id/check-payment - Check payment on all enabled chains
 * If payment found, triggers the full pipeline
 */
router.post('/:id/check-payment', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // If already processed, return current status
    if (['PAID_DETECTED', 'CONVERTING', 'SETTLING', 'CASHED_OUT', 'COMPLETE'].includes(invoice.status)) {
      const pipelineStatus = await pipeline.getPipelineSummary(invoice._id);
      return res.json({
        success: true,
        data: {
          invoiceId: invoice._id,
          status: invoice.status,
          paid: true,
          pipeline: pipelineStatus,
        },
      });
    }

    // If not sent yet, can't check payment
    if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED' || invoice.status === 'FAILED') {
      return res.json({
        success: true,
        data: {
          invoiceId: invoice._id,
          status: invoice.status,
          paid: false,
          message: invoice.status === 'DRAFT' ? 'Invoice not yet sent' : `Invoice is ${invoice.status.toLowerCase()}`,
        },
      });
    }

    // Check for payment and process if found
    const result = await pipeline.checkAndProcessPayment(invoice._id);

    if (result.found) {
      // Payment detected and pipeline started
      const pipelineStatus = await pipeline.getPipelineSummary(invoice._id);
      return res.json({
        success: true,
        data: {
          invoiceId: invoice._id,
          status: result.invoice.status,
          paid: true,
          chain: result.chain,
          pipeline: pipelineStatus,
        },
      });
    }

    // No payment found yet
    res.json({
      success: true,
      data: {
        invoiceId: invoice._id,
        status: invoice.status,
        paid: false,
        depositAddresses: invoice.depositAddresses,
        solanaPayUrl: invoice.solanaPayUrl,
      },
    });
  } catch (error) {
    console.error('Check payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check payment',
    });
  }
});

/**
 * POST /api/invoices/:id/simulate-payment - Simulate a payment for testing
 * Simulates a payment on the specified chain without real blockchain
 */
router.post('/:id/simulate-payment', async (req, res) => {
  try {
    const { chain } = req.body;

    if (!chain || !['BTC', 'ETH', 'SOL'].includes(chain.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chain. Must be one of: BTC, ETH, SOL',
      });
    }

    const normalizedChain = chain.toUpperCase();

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Must be in SENT status
    if (invoice.status !== 'SENT') {
      return res.status(400).json({
        success: false,
        error: `Cannot simulate payment. Invoice status is ${invoice.status}`,
      });
    }

    // Check if chain is enabled
    const chainKey = `allow${normalizedChain.charAt(0)}${normalizedChain.slice(1).toLowerCase()}`;
    if (!invoice.paymentOptions[chainKey]) {
      return res.status(400).json({
        success: false,
        error: `${normalizedChain} payments are not enabled for this invoice`,
      });
    }

    // Get address or reference for simulation
    let addressOrReference;
    if (normalizedChain === 'SOL') {
      addressOrReference = invoice.referencePublicKey;
    } else {
      addressOrReference = invoice.depositAddresses[normalizedChain.toLowerCase()];
    }

    if (!addressOrReference) {
      return res.status(400).json({
        success: false,
        error: `No deposit address found for ${normalizedChain}`,
      });
    }

    // Calculate expected amount
    const rates = invoice.lockedQuote?.rates || chains.getRates();
    const expectedAmount = chains.usdToChainAmount(normalizedChain, invoice.total);

    // Simulate the payment
    const simResult = chains.simulatePayment(normalizedChain, addressOrReference, expectedAmount);

    res.json({
      success: true,
      data: {
        message: `Simulated ${normalizedChain} payment`,
        chain: normalizedChain,
        amount: expectedAmount,
        formattedAmount: chains.formatAmount(normalizedChain, expectedAmount),
        txHash: simResult.txHash,
        note: 'Call /check-payment to detect this payment and trigger the pipeline',
      },
    });
  } catch (error) {
    console.error('Simulate payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate payment',
    });
  }
});

/**
 * GET /api/invoices/:id/pipeline-status - Get detailed pipeline status
 */
router.get('/:id/pipeline-status', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    const pipelineStatus = await pipeline.getPipelineStatus(invoice._id);
    const pipelineSummary = await pipeline.getPipelineSummary(invoice._id);

    res.json({
      success: true,
      data: {
        status: pipelineStatus,
        summary: pipelineSummary,
      },
    });
  } catch (error) {
    console.error('Get pipeline status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pipeline status',
    });
  }
});

/**
 * POST /api/invoices/:id/cancel - Cancel invoice
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Can't cancel if already paid or in pipeline
    const nonCancellableStatuses = ['PAID_DETECTED', 'CONVERTING', 'SETTLING', 'CASHED_OUT', 'COMPLETE'];
    if (nonCancellableStatuses.includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel invoice that is being processed or already paid',
      });
    }

    invoice.status = 'CANCELLED';
    await invoice.save();

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Cancel invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel invoice',
    });
  }
});

module.exports = router;
