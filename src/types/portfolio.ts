export type InvestigationMode = 'demo' | 'live';

export interface PortfolioHolding {
  symbol: string;
  quantity: number;
}

export interface MarketEvidence {
  symbol: string;
  pair: string;
  currentPrice: number;
  previousPrice: number;
  source: 'sample' | 'binance-spot-api';
  comparisonLabel: string;
}

export interface AssetEvidence extends PortfolioHolding, MarketEvidence {
  previousValue: number;
  currentValue: number;
  allocationPercentage: number | null;
  dollarChange: number;
  priceChangePercentage: number | null;
  netContributionPercentage: number | null;
  grossContributionPercentage: number | null;
}

export interface InvestigationResult {
  mode: InvestigationMode;
  generatedAt: string;
  previousPortfolioValue: number;
  currentPortfolioValue: number;
  totalChange: number;
  portfolioChangePercentage: number | null;
  grossMovement: number;
  hasOffsettingMoves: boolean;
  contributionBasis: 'net' | 'gross' | 'unavailable';
  assets: AssetEvidence[];
  largestPositiveContributor: AssetEvidence | null;
  largestNegativeContributor: AssetEvidence | null;
  overallMainContributor: AssetEvidence | null;
  summary: string;
  caveat: string | null;
}

export interface InvestigationProgress {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}
