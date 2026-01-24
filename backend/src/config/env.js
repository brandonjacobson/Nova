require('dotenv').config();

const config = {
	port: process.env.PORT || 4000,
	solanaRpcUrl: process.env.SOLANA_RPC_URL,
	solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY,
	nessieApiKey: process.env.NESSIE_API_KEY,
	nessieClientAccountId: process.env.NESSIE_CLIENT_ACCOUNT_ID,
	nessieMerchantAccountId: process.env.NESSIE_MERCHANT_ACCOUNT_ID,
};

module.exports = config;
