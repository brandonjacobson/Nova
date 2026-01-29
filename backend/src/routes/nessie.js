const express = require("express");
const router = express.Router();

const BASE = "https://api.reimaginebanking.com";
const KEY = process.env.NESSIE_KEY;

// Helper: get first account
async function getFirstAccount() {
  const r = await fetch(`${BASE}/accounts?key=${KEY}`);
  const data = await r.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No Nessie accounts found for this API key");
  }
  return data[0];
}

// GET /api/nessie/balance
router.get("/balance", async (req, res) => {
  try {
    const acct = await getFirstAccount();
    res.json({ ok: true, accountId: acct._id, balance: acct.balance, nickname: acct.nickname });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/nessie/deposit
router.post("/deposit", async (req, res) => {
  try {
    const { amount } = req.body;
    const amt = Number(amount || 250);

    const acct = await getFirstAccount();

    const r = await fetch(`${BASE}/accounts/${acct._id}/deposits?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        medium: "balance",
        amount: amt,
        status: "completed",
        transaction_date: new Date().toISOString().slice(0, 10),
        description: "Fiat settlement from crypto payment demo",
      }),
    });

    const data = await r.json();
    res.json({ ok: true, deposit: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;