/**
 * Public routes - No authentication required
 * Used for payment pages that clients access
 */

const express = require('express');
const router = express.Router();
const { Invoice, Business } = require('../models');
const solanaService = require('../services/solana');

/**
 * GET /api/public/invoice/:id - Get invoice for payment page
 * Returns limited invoice data for the public payment view
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

    // Return limited data for public view
    res.json({
      success: true,
      data: {
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
        // Payment details
        paymentToken: invoice.paymentToken,
        paymentAmount: invoice.paymentAmount,
        solanaPayUrl: invoice.solanaPayUrl,
        recipientAddress: invoice.recipientAddress,
        // Status booleans
        isPaid: invoice.status === 'PAID' || invoice.status === 'SETTLED',
        isSettled: invoice.status === 'SETTLED',
        isCancelled: invoice.status === 'CANCELLED',
        isPending: invoice.status === 'SENT' || invoice.status === 'PENDING',
      },
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
 * Returns PNG image of QR code
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
        error: 'Invoice has no payment URL. It may not have been sent yet.',
      });
    }

    // Generate QR code as PNG buffer
    const qrBuffer = await solanaService.generateQRCodeBuffer(invoice.solanaPayUrl, {
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
        error: 'Invoice has no payment URL',
      });
    }

    // Generate QR code as data URL
    const qrDataUrl = await solanaService.generateQRCode(invoice.solanaPayUrl, {
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
 * Allows payment page to poll for payment confirmation
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

    // If already paid, return success
    if (invoice.status === 'PAID' || invoice.status === 'SETTLED') {
      return res.json({
        success: true,
        data: {
          status: invoice.status,
          paid: true,
          transactionSignature: invoice.transactionSignature,
          explorerUrl: invoice.transactionSignature
            ? solanaService.getExplorerUrl(invoice.transactionSignature)
            : null,
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
          message: 'Invoice is not awaiting payment',
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
          status: 'PAID',
          paid: true,
          transactionSignature: verification.signature,
          explorerUrl: solanaService.getExplorerUrl(verification.signature),
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

module.exports = router;
