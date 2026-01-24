const express = require('express');
const router = express.Router();
const { Invoice, Business } = require('../models');
const { authenticate } = require('../middleware/auth');
const solanaService = require('../services/solana');

// All invoice routes require authentication
router.use(authenticate);

/**
 * POST /api/invoices - Create new invoice
 */
router.post('/', async (req, res) => {
  try {
    const { clientName, clientEmail, clientAddress, items, dueDate, notes, paymentToken } = req.body;

    // Validate required fields
    if (!clientName || !clientEmail || !items || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: clientName, clientEmail, items, dueDate',
      });
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items must be a non-empty array',
      });
    }

    // Validate payment token
    const validTokens = ['SOL', 'USDC'];
    const token = paymentToken?.toUpperCase() || 'SOL';
    if (!validTokens.includes(token)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment token. Must be one of: ${validTokens.join(', ')}`,
      });
    }

    // Get next invoice number
    const business = await Business.findById(req.businessId);
    const invoiceNumber = await business.getNextInvoiceNumber();

    // Create invoice
    const invoice = await Invoice.create({
      businessId: req.businessId,
      invoiceNumber,
      clientName,
      clientEmail,
      clientAddress: clientAddress || '',
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice,
      })),
      dueDate: new Date(dueDate),
      notes: notes || '',
      paymentToken: token,
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
    const { status, page = 1, limit = 20 } = req.query;

    // Build query
    const query = { businessId: req.businessId };
    if (status) {
      query.status = status.toUpperCase();
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

    const { clientName, clientEmail, clientAddress, items, dueDate, notes } = req.body;

    // Update fields
    if (clientName) invoice.clientName = clientName;
    if (clientEmail) invoice.clientEmail = clientEmail;
    if (clientAddress !== undefined) invoice.clientAddress = clientAddress;
    if (items) {
      invoice.items = items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice,
      }));
    }
    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (notes !== undefined) invoice.notes = notes;

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
 * POST /api/invoices/:id/send - Mark invoice as sent and generate Solana Pay URL
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

    // Get business for wallet address
    const business = await Business.findById(req.businessId);

    if (!business.solanaWalletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Business has no Solana wallet configured. Please add a wallet address in settings.',
      });
    }

    // Generate unique reference for tracking this payment on-chain
    const reference = solanaService.generateReference();

    // Create Solana Pay URL
    const paymentData = solanaService.createPaymentUrl({
      recipient: business.solanaWalletAddress,
      amountUsdCents: invoice.total,
      token: invoice.paymentToken,
      reference,
      label: business.name,
      message: `Invoice ${invoice.invoiceNumber}`,
      memo: invoice.invoiceNumber,
    });

    // Update invoice with payment details
    invoice.recipientAddress = business.solanaWalletAddress;
    invoice.referencePublicKey = reference;
    invoice.solanaPayUrl = paymentData.url;
    invoice.paymentAmount = paymentData.amount;
    invoice.paymentAmountSmallestUnit = paymentData.amountSmallestUnit;
    invoice.status = 'SENT';
    invoice.issueDate = new Date();

    await invoice.save();

    // TODO: Send email notification to client

    res.json({
      success: true,
      data: invoice,
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
 * POST /api/invoices/:id/check-payment - Check Solana payment status (on-chain verification)
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

    // If already paid or settled, return current status
    if (invoice.status === 'PAID' || invoice.status === 'SETTLED') {
      return res.json({
        success: true,
        data: {
          invoiceId: invoice._id,
          status: invoice.status,
          paid: true,
          settled: invoice.status === 'SETTLED',
          transactionSignature: invoice.transactionSignature,
          explorerUrl: invoice.transactionSignature
            ? solanaService.getExplorerUrl(invoice.transactionSignature)
            : null,
        },
      });
    }

    // If not sent yet, can't check payment
    if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') {
      return res.json({
        success: true,
        data: {
          invoiceId: invoice._id,
          status: invoice.status,
          paid: false,
          message: invoice.status === 'DRAFT'
            ? 'Invoice not yet sent'
            : 'Invoice was cancelled',
        },
      });
    }

    // Verify payment on-chain
    const verification = await solanaService.verifyPayment(invoice);

    if (verification.found && verification.valid) {
      // Payment confirmed! Update invoice
      invoice.status = 'PAID';
      invoice.paidAt = new Date();
      invoice.transactionSignature = verification.signature;
      await invoice.save();

      return res.json({
        success: true,
        data: {
          invoiceId: invoice._id,
          status: 'PAID',
          paid: true,
          settled: false,
          transactionSignature: verification.signature,
          explorerUrl: solanaService.getExplorerUrl(verification.signature),
        },
      });
    }

    // Payment not found yet
    res.json({
      success: true,
      data: {
        invoiceId: invoice._id,
        status: invoice.status,
        paid: false,
        settled: false,
        solanaPayUrl: invoice.solanaPayUrl,
        paymentAmount: invoice.paymentAmount,
        paymentToken: invoice.paymentToken,
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

    // Can't cancel if already paid or settled
    if (invoice.status === 'PAID' || invoice.status === 'SETTLED') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel paid or settled invoice',
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
