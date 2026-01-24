const express = require('express');
const router = express.Router();
const { Invoice, Payment, Settlement } = require('../models');
const { authenticate } = require('../middleware/auth');

// All dashboard routes require authentication
router.use(authenticate);

/**
 * GET /api/dashboard/stats - Get dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const businessId = req.businessId;

    // Get invoice counts by status
    const [statusCounts, revenueData] = await Promise.all([
      Invoice.aggregate([
        { $match: { businessId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { businessId, status: { $in: ['PAID', 'SETTLED'] } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Transform status counts
    const statusMap = {};
    statusCounts.forEach((item) => {
      statusMap[item._id] = item.count;
    });

    // Get pending revenue (sent but not paid)
    const pendingData = await Invoice.aggregate([
      { $match: { businessId, status: { $in: ['SENT', 'PENDING'] } } },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get this month's revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await Invoice.aggregate([
      {
        $match: {
          businessId,
          status: { $in: ['PAID', 'SETTLED'] },
          paidAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        invoices: {
          total: Object.values(statusMap).reduce((a, b) => a + b, 0),
          draft: statusMap['DRAFT'] || 0,
          sent: statusMap['SENT'] || 0,
          pending: statusMap['PENDING'] || 0,
          paid: statusMap['PAID'] || 0,
          settled: statusMap['SETTLED'] || 0,
          cancelled: statusMap['CANCELLED'] || 0,
        },
        revenue: {
          total: revenueData[0]?.totalRevenue || 0,
          thisMonth: monthlyRevenue[0]?.total || 0,
          paidInvoices: revenueData[0]?.count || 0,
        },
        pending: {
          amount: pendingData[0]?.total || 0,
          count: pendingData[0]?.count || 0,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard stats',
    });
  }
});

/**
 * GET /api/dashboard/recent - Get recent activity
 */
router.get('/recent', async (req, res) => {
  try {
    const businessId = req.businessId;
    const limit = parseInt(req.query.limit) || 5;

    // Get recent invoices
    const recentInvoices = await Invoice.find({ businessId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('invoiceNumber clientName total status createdAt');

    // Get recent payments
    const recentPayments = await Payment.find({ businessId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('invoiceId', 'invoiceNumber clientName')
      .select('amountLamports status createdAt invoiceId');

    // Get recent settlements
    const recentSettlements = await Settlement.find({ businessId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('invoiceId', 'invoiceNumber clientName')
      .select('amountCents status createdAt invoiceId');

    res.json({
      success: true,
      data: {
        invoices: recentInvoices,
        payments: recentPayments,
        settlements: recentSettlements,
      },
    });
  } catch (error) {
    console.error('Dashboard recent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent activity',
    });
  }
});

module.exports = router;
