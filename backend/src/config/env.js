require('dotenv').config();

const config = {
  port: process.env.PORT || 4000,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || 'mercury-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY,
  nessieApiKey: process.env.NESSIE_API_KEY,
  nessieBaseUrl: process.env.NESSIE_BASE_URL || 'http://api.nessieisreal.com',
  nessieHoldingAccountId: process.env.NESSIE_HOLDING_ACCOUNT_ID,
};

module.exports = config;
