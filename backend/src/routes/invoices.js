const express = require('express');
const router = express.Router();
const { Invoice, Business } = require('../models');
const { authenticate } = require('../middleware/auth');

// All invoice routes require authentication
router.use(authenticate);

/**
 * POST /api/invoices - Create new invoice
 */
router.post('/', async (req, res) => {
  try {
    const { clientName, clientEmail, clientAddress, items, dueDate, notes } = req.body;

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
 * POST /api/invoices/:id/send - Mark invoice as sent
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

    // TODO: Generate Solana payment address here
    // For now, generate a placeholder address
    invoice.solanaPaymentAddress = `demo_${invoice._id.toString().slice(-8)}`;

    // Calculate SOL amount (using demo rate: 1 SOL = $150)
    const SOL_USD_RATE = 150;
    const usdAmount = invoice.total / 100; // Convert cents to dollars
    const solAmount = usdAmount / SOL_USD_RATE;
    invoice.solanaAmountLamports = Math.ceil(solAmount * 1_000_000_000); // Convert to lamports

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
 * POST /api/invoices/:id/check-payment - Check Solana payment status
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

    // TODO: Integrate Solana payment verification
    // For demo, return current status
    res.json({
      success: true,
      data: {
        invoiceId: invoice._id,
        status: invoice.status,
        solanaPaymentAddress: invoice.solanaPaymentAddress,
        solanaAmountLamports: invoice.solanaAmountLamports,
        paid: invoice.status === 'PAID' || invoice.status === 'SETTLED',
        settled: invoice.status === 'SETTLED',
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
