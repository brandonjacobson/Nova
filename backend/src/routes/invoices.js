const express = require('express');
const router = express.Router();

// POST /api/invoices	-> create invoice
router.post('/', async (req, res) => {
	//TODO: save to DB and link Solana address
	return res.json({
	  ok: true,
	  invoice: {
	    id: 'demo-id',
	    ...req.body,
	  },
	});
});

// GET /api/invoices	-> list invoices
router.get('/', async (req, res) => {
	//TODO: read from DB
	return res.json({ invoices: [] });
});

// GET /api/invoices/:id    -> get invoice details
router.get('/:id', async (req, res) => {
	//TODO: read from DB
	return res.json({
	  id: req.params.id,
	  status: 'PENDING',
	});
});

// POST /api/invoices/:id/check-payment    -> check Solana + Nessie
router.post('/:id/check-payment', async (req, res) => {
	//TODO: integrate Solana + Nessie here
	return res.json({
	  id: req.params.id,
	  status: 'PENDING',
	  solanaPaid: false,
	  nessieSettled: false,
	});
});

module.exports = router;
