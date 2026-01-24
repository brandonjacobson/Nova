require('dotenv').config();
const express = require('express');
const cors = require('cors');

const invoicesRouter = require('./routes/invoices');

const app = express();
app.use(cors());
app.use(express.json());

//API Routes
app.use('/api/invoices', invoicesRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
});
