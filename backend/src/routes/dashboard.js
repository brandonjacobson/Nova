const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Invoice, Payment, Settlement, FiatSettlement, Business } = require('../models');
const { authenticate } = require('../middleware/auth');
const { requireBusiness } = require('../utils/businessScope');

// All dashboard routes require authentication
router.use(authenticate, requireBusiness);

/**
 * GET /api/dashboard/stats - Get dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Convert businessId to ObjectId for aggregate queries
    const businessId = new mongoose.Types.ObjectId(req.businessId);

    // Get invoice counts by status
    const paidStatuses = ['CASHED_OUT', 'COMPLETE'];
    const [statusCounts, revenueData] = await Promise.all([
      Invoice.aggregate([
        { $match: { businessId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { businessId, status: { $in: paidStatuses } } },
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

    // Get projected revenue from sent invoices
    const projectedData = await Invoice.aggregate([
      { $match: { businessId, status: 'SENT' } },
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
          status: { $in: paidStatuses },
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
          paid: (statusMap['COMPLETE'] || 0) + (statusMap['CASHED_OUT'] || 0),
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
        projected: {
          amount: projectedData[0]?.total || 0,
          count: projectedData[0]?.count || 0,
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
    let limit = parseInt(req.query.limit, 10) || 5;
    limit = Math.min(50, Math.max(1, limit));

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
      .select('amount usdValueCents status confirmedAt createdAt invoiceId chain');

    // Get recent settlements
    const recentSettlements = await Settlement.find({ businessId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('invoiceId', 'invoiceNumber clientName')
      .select('amount amountUsd asset status completedAt createdAt invoiceId');

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

/**
 * GET /api/dashboard/cashouts - Get fiat settlement (cashout) history and statistics
 */
router.get('/cashouts', async (req, res) => {
  try {
    const businessId = req.businessId;
    const limit = parseInt(req.query.limit) || 10;

    const recentCashouts = await FiatSettlement.find({ businessId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('invoiceId', 'invoiceNumber clientName total');

    const statusCounts = await FiatSettlement.aggregate([
      { $match: { businessId: new mongoose.Types.ObjectId(businessId) } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalCents: { $sum: '$amountCents' } } },
    ]);

    const statusMap = {};
    let totalCents = 0;
    statusCounts.forEach((item) => {
      statusMap[item._id] = {
        count: item.count,
        totalCents: item.totalCents,
        formattedTotal: `$${((item.totalCents || 0) / 100).toFixed(2)}`,
      };
      totalCents += item.totalCents || 0;
    });

    const cashoutStats = {
      totalCents,
      formattedTotal: `$${(totalCents / 100).toFixed(2)}`,
      totalCount: statusCounts.reduce((sum, item) => sum + (item.count || 0), 0),
    };

    res.json({
      success: true,
      data: {
        stats: {
          totalCashedOut: cashoutStats.totalCents,
          formattedTotal: cashoutStats.formattedTotal,
          totalCount: cashoutStats.totalCount,
          byStatus: statusMap,
        },
        recentCashouts: recentCashouts.map((c) => ({
          id: c._id,
          invoiceId: c.invoiceId?._id,
          invoiceNumber: c.invoiceId?.invoiceNumber,
          clientName: c.invoiceId?.clientName,
          amountCents: c.amountCents,
          formattedAmount: `$${(c.amountCents / 100).toFixed(2)}`,
          status: c.status,
          completedAt: c.completedAt,
          createdAt: c.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Dashboard cashouts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cashout data',
    });
  }
});

module.exports = router;
