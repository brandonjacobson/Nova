/**
 * Services Index
 *
 * Central export point for all backend services.
 * Import from here for clean imports throughout the application.
 */

// Phase 2: Chain Services
const bitcoin = require('./bitcoin');
const ethereum = require('./ethereum');
const solana = require('./solana');
const chains = require('./chains');

// Phase 3: Core Engine Services
const quote = require('./quote');
const conversion = require('./conversion');
const settlement = require('./settlement');
const pipeline = require('./pipeline');

module.exports = {
  // Individual chain services
  bitcoin,
  ethereum,
  solana,

  // Unified chain interface (recommended)
  chains,

  // Quote/pricing service
  quote,

  // Conversion engine (Mode A cross-chain)
  conversion,

  // Settlement engine (payout to merchant)
  settlement,

  // Payment pipeline orchestrator
  pipeline,
};
