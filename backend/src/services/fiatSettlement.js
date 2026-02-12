const FiatSettlement = require('../models/FiatSettlement');

async function executeFiatSettlement({
  invoiceId,
  businessId,
  bankAccountId,
  amountCents,
  description,
}) {
  // TODO: integrate real bank API here.
  // For now: simulate it.
  const bankTransferId = `demo-${Date.now()}`;

  const settlement = await FiatSettlement.create({
    invoiceId,
    businessId,
    bankAccountId,
    amountCents,
    bankTransferId,
    status: 'COMPLETED',
    completedAt: new Date(),
    rawResponse: null,
  });

  return settlement;
}

async function getFiatSettlementByInvoice(invoiceId) {
  return FiatSettlement.findOne({ invoiceId }).sort({ createdAt: -1 });
}

module.exports = {
  executeFiatSettlement,
  getFiatSettlementByInvoice,
};
