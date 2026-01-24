require('dotenv').config();

const config = {
  port: process.env.PORT || 4000,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || 'mercury-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Solana Pay - non-custodial, no private key needed!
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  // Nessie (Capital One sandbox)
  nessieApiKey: process.env.NESSIE_API_KEY,
  nessieBaseUrl: process.env.NESSIE_BASE_URL || 'http://api.nessieisreal.com',
  nessieHoldingAccountId: process.env.NESSIE_HOLDING_ACCOUNT_ID,
};

module.exports = config;
