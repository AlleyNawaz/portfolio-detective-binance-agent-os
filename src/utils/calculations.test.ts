import { describe, expect, it } from 'vitest';
import type { MarketEvidence, PortfolioHolding } from '../types/portfolio';
import { calculateInvestigation } from './calculations';

const evidence = (symbol: string, previousPrice: number, currentPrice: number): MarketEvidence => ({ symbol, pair: `${symbol}USDT`, previousPrice, currentPrice, source: 'sample', comparisonLabel: 'Test period' });
const holding = (symbol: string, quantity: number): PortfolioHolding => ({ symbol, quantity });

describe('calculateInvestigation', () => {
  it('calculates an increased portfolio', () => {
    const result = calculateInvestigation([holding('BTC', 2)], [evidence('BTC', 100, 125)], 'demo');
    expect(result.totalChange).toBe(50);
    expect(result.portfolioChangePercentage).toBe(25);
    expect(result.largestPositiveContributor?.symbol).toBe('BTC');
  });

  it('calculates a decreased portfolio', () => {
    const result = calculateInvestigation([holding('ETH', 3)], [evidence('ETH', 100, 80)], 'demo');
    expect(result.totalChange).toBe(-60);
    expect(result.largestNegativeContributor?.symbol).toBe('ETH');
  });

  it('uses gross contribution for mixed movement', () => {
    const result = calculateInvestigation([holding('BTC', 1), holding('ETH', 1)], [evidence('BTC', 100, 130), evidence('ETH', 100, 80)], 'demo');
    expect(result.totalChange).toBe(10);
    expect(result.hasOffsettingMoves).toBe(true);
    expect(result.contributionBasis).toBe('gross');
    expect(result.assets.find((asset) => asset.symbol === 'BTC')?.grossContributionPercentage).toBe(60);
  });

  it('rejects an empty portfolio', () => {
    expect(() => calculateInvestigation([], [], 'demo')).toThrow('EMPTY_PORTFOLIO');
  });

  it('handles a zero previous value', () => {
    const result = calculateInvestigation([holding('NEW', 2)], [evidence('NEW', 0, 5)], 'demo');
    expect(result.previousPortfolioValue).toBe(0);
    expect(result.portfolioChangePercentage).toBeNull();
    expect(result.assets[0].priceChangePercentage).toBeNull();
  });

  it('handles a one asset portfolio', () => {
    const result = calculateInvestigation([holding('BNB', 1)], [evidence('BNB', 500, 450)], 'demo');
    expect(result.overallMainContributor?.symbol).toBe('BNB');
    expect(result.assets[0].netContributionPercentage).toBe(100);
  });

  it('avoids net percentages for an effectively unchanged portfolio', () => {
    const result = calculateInvestigation([holding('A', 1), holding('B', 1)], [evidence('A', 100, 110), evidence('B', 100, 90)], 'demo');
    expect(result.totalChange).toBe(0);
    expect(result.assets.every((asset) => asset.netContributionPercentage === null)).toBe(true);
  });
});
