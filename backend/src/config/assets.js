const ASSETS = {
  BTC: {
    symbol: 'BTC',
    category: 'crypto',
    type: 'native',
    chain: 'BTC',
    decimals: 8,
  },
  ETH: {
    symbol: 'ETH',
    category: 'crypto',
    type: 'native',
    chain: 'ETH',
    decimals: 18,
  },
  SOL: {
    symbol: 'SOL',
    category: 'crypto',
    type: 'native',
    chain: 'SOL',
    decimals: 9,
  },
  USDC: {
    symbol: 'USDC',
    category: 'crypto',
    type: 'token',
    chain: 'ETH',          // ERC-20 on Ethereum
    decimals: 6,
  },
  USDT: {
    symbol: 'USDT',
    category: 'crypto',
    type: 'token',
    chain: 'ETH',          // ERC-20 on Ethereum
    decimals: 6,
  },
  USD: {
    symbol: 'USD',
    category: 'fiat',
    type: 'fiat',
    chain: null,
    decimals: 2,
  },
};

const PAYMENT_ASSETS = ['BTC', 'ETH', 'SOL']; // MVP: what customers can pay with
// later you can allow USDC/USDT here too

const SETTLEMENT_ASSETS = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'USD'];

const CRYPTO_SETTLEMENT_ASSETS = SETTLEMENT_ASSETS.filter(
  (s) => ASSETS[s].category === 'crypto'
);

const FIAT_SETTLEMENT_ASSETS = ['USD'];

function isCryptoAsset(symbol) {
  return ASSETS[symbol]?.category === 'crypto';
}

function isFiatAsset(symbol) {
  return ASSETS[symbol]?.category === 'fiat';
}

function getNetwork(symbol) {
  const asset = ASSETS[symbol];
  if (!asset) throw new Error(`Unknown asset: ${symbol}`);
  return asset.chain; // 'BTC' | 'ETH' | 'SOL' | null for fiat
}

function getDecimals(symbol) {
  const asset = ASSETS[symbol];
  if (!asset) throw new Error(`Unknown asset: ${symbol}`);
  return asset.decimals;
}

module.exports = {
  ASSETS,
  PAYMENT_ASSETS,
  SETTLEMENT_ASSETS,
  CRYPTO_SETTLEMENT_ASSETS,
  FIAT_SETTLEMENT_ASSETS,
  isCryptoAsset,
  isFiatAsset,
  getNetwork,
  getDecimals,
};
