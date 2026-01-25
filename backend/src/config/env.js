require('dotenv').config();

const config = {
  port: process.env.PORT || 4000,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || 'mercury-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // ========== BLOCKCHAIN CONFIGURATION ==========

  // Solana - non-custodial via Solana Pay
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',

  // Ethereum - Sepolia testnet (simulated for hackathon)
  ethRpcUrl: process.env.ETH_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_API_KEY',
  ethNetwork: process.env.ETH_NETWORK || 'sepolia',

  // Bitcoin - testnet (simulated for hackathon)
  btcNetwork: process.env.BTC_NETWORK || 'testnet',
  blockcypherToken: process.env.BLOCKCYPHER_TOKEN || '', // Optional, for higher rate limits

  // ========== FIAT CONFIGURATION ==========

  // Nessie (Capital One sandbox)
  nessieApiKey: process.env.NESSIE_API_KEY,
  nessieBaseUrl: process.env.NESSIE_BASE_URL || 'http://api.nessieisreal.com',
  nessieHoldingAccountId: process.env.NESSIE_HOLDING_ACCOUNT_ID,

  // ========== FEATURE FLAGS ==========

  // Enable/disable simulated payment detection (true for hackathon demo)
  useSimulatedPayments: process.env.USE_SIMULATED_PAYMENTS !== 'false',

  // ========== DEMO MODE ==========

  // Enable demo mode for visual delays during presentations
  // When true, pipeline stages pause briefly for visible status transitions
  demoMode: process.env.DEMO_MODE === 'true',

  // Delay duration in milliseconds between pipeline stages (default 1500ms)
  demoDelayMs: parseInt(process.env.DEMO_DELAY_MS, 10) || 1500,
};

module.exports = config;
