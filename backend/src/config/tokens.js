/**
 * Token configuration for Solana Pay
 *
 * For devnet testing, we use the SPL Token Faucet's DUMMY token as USDC
 * Get test tokens at: https://spl-token-faucet.com/?token-name=USDC
 */

const TOKENS = {
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    mint: null, // Native SOL has no mint address
    // 1 SOL = 1,000,000,000 lamports
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    mint: {
      // SPL Token Faucet DUMMY token (works on devnet)
      // Get tokens: https://spl-token-faucet.com/?token-name=USDC
      devnet: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
      // Real USDC on mainnet
      mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
  },
};

// Helper to get the correct mint address for a token
const getTokenMint = (token, network = 'devnet') => {
  if (token === 'SOL') return null;

  const tokenConfig = TOKENS[token];
  if (!tokenConfig) {
    throw new Error(`Unknown token: ${token}`);
  }

  if (typeof tokenConfig.mint === 'string') {
    return tokenConfig.mint;
  }

  return tokenConfig.mint[network];
};

// Helper to get token decimals
const getTokenDecimals = (token) => {
  const tokenConfig = TOKENS[token];
  if (!tokenConfig) {
    throw new Error(`Unknown token: ${token}`);
  }
  return tokenConfig.decimals;
};

// Convert USD cents to token amount (for display/payment)
// Uses a fixed rate for demo purposes
const DEMO_RATES = {
  SOL: 150, // 1 SOL = $150 USD
  USDC: 1,  // 1 USDC = $1 USD (stablecoin)
};

const usdCentsToTokenAmount = (usdCents, token) => {
  const rate = DEMO_RATES[token];
  if (!rate) {
    throw new Error(`No rate configured for token: ${token}`);
  }

  const usdAmount = usdCents / 100;
  return usdAmount / rate;
};

// Convert token amount to smallest unit (lamports for SOL, micro-units for USDC)
const toSmallestUnit = (amount, token) => {
  const decimals = getTokenDecimals(token);
  return Math.ceil(amount * Math.pow(10, decimals));
};

module.exports = {
  TOKENS,
  getTokenMint,
  getTokenDecimals,
  usdCentsToTokenAmount,
  toSmallestUnit,
  DEMO_RATES,
};
