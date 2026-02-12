require('dotenv').config();

const config = {
  port: process.env.PORT || 4000,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',

  // ========== BLOCKCHAIN CONFIGURATION ==========

  // Solana - non-custodial via Solana Pay
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',

  // Ethereum - Sepolia testnet (simulated for hackathon)
  ethRpcUrl: process.env.ETH_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_API_KEY',
  ethNetwork: process.env.ETH_NETWORK || 'sepolia',

  // ========== FEATURE FLAGS ==========

  // Enable/disable simulated payment detection (true for hackathon demo)
  useSimulatedPayments: process.env.USE_SIMULATED_PAYMENTS !== 'false',

  // ========== DEMO MODE ==========

  // Enable demo mode for visual delays during presentations
  // When true, pipeline stages pause briefly for visible status transitions
  demoMode: process.env.DEMO_MODE === 'true',

  // Delay duration in milliseconds between pipeline stages (default 1500ms)
  demoDelayMs: parseInt(process.env.DEMO_DELAY_MS, 10) || 1500,

  // Frontend base URL (for payment links in PDFs and emails)
  frontendUrl: process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Email (optional - for sending invoices)
  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER,
};

module.exports = config;
