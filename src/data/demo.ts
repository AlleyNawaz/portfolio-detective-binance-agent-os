import type { MarketEvidence, PortfolioHolding } from '../types/portfolio';

export const DEMO_HOLDINGS: PortfolioHolding[] = [
  { symbol: 'BTC', quantity: 0.018 },
  { symbol: 'ETH', quantity: 0.72 },
  { symbol: 'BNB', quantity: 2.4 },
  { symbol: 'SOL', quantity: 5.5 },
];

// Deliberately fixed evidence keeps the hackathon demo reproducible and offline-friendly.
export const DEMO_MARKET_EVIDENCE: MarketEvidence[] = [
  { symbol: 'BTC', pair: 'BTCUSDT', previousPrice: 82_450, currentPrice: 80_900, source: 'sample', comparisonLabel: 'Sample 24-hour comparison' },
  { symbol: 'ETH', pair: 'ETHUSDT', previousPrice: 3_480, currentPrice: 3_165, source: 'sample', comparisonLabel: 'Sample 24-hour comparison' },
  { symbol: 'BNB', pair: 'BNBUSDT', previousPrice: 815, currentPrice: 842, source: 'sample', comparisonLabel: 'Sample 24-hour comparison' },
  { symbol: 'SOL', pair: 'SOLUSDT', previousPrice: 196, currentPrice: 188, source: 'sample', comparisonLabel: 'Sample 24-hour comparison' },
];
