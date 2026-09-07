import type { AssetEvidence, InvestigationMode, InvestigationResult, MarketEvidence, PortfolioHolding } from '../types/portfolio';

const EPSILON = 0.005;

export function calculateInvestigation(
  holdings: PortfolioHolding[],
  markets: MarketEvidence[],
  mode: InvestigationMode,
  generatedAt = new Date().toISOString(),
): InvestigationResult {
  if (holdings.length === 0) throw new Error('EMPTY_PORTFOLIO');

  const marketBySymbol = new Map(markets.map((market) => [market.symbol, market]));
  const partial = holdings.map((holding) => {
    const market = marketBySymbol.get(holding.symbol);
    if (!market) throw new Error(`MARKET_DATA_UNAVAILABLE:${holding.symbol}`);
    if (![holding.quantity, market.currentPrice, market.previousPrice].every(Number.isFinite)) {
      throw new Error(`INVALID_EVIDENCE:${holding.symbol}`);
    }
    const previousValue = holding.quantity * market.previousPrice;
    const currentValue = holding.quantity * market.currentPrice;
    return {
      ...holding,
      ...market,
      previousValue,
      currentValue,
      dollarChange: currentValue - previousValue,
    };
  });

  const previousPortfolioValue = partial.reduce((sum, asset) => sum + asset.previousValue, 0);
  const currentPortfolioValue = partial.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalChange = currentPortfolioValue - previousPortfolioValue;
  const grossMovement = partial.reduce((sum, asset) => sum + Math.abs(asset.dollarChange), 0);
  const hasPositive = partial.some((asset) => asset.dollarChange > EPSILON);
  const hasNegative = partial.some((asset) => asset.dollarChange < -EPSILON);
  const hasOffsettingMoves = hasPositive && hasNegative;

  const assets: AssetEvidence[] = partial
    .map((asset) => ({
      ...asset,
      allocationPercentage: currentPortfolioValue === 0 ? null : (asset.currentValue / currentPortfolioValue) * 100,
      priceChangePercentage: asset.previousPrice === 0 ? null : ((asset.currentPrice - asset.previousPrice) / asset.previousPrice) * 100,
      netContributionPercentage: Math.abs(totalChange) <= EPSILON ? null : (asset.dollarChange / totalChange) * 100,
      grossContributionPercentage: grossMovement <= EPSILON ? null : (Math.abs(asset.dollarChange) / grossMovement) * 100,
    }))
    .sort((a, b) => Math.abs(b.dollarChange) - Math.abs(a.dollarChange));

  const positive = assets.filter((asset) => asset.dollarChange > EPSILON).sort((a, b) => b.dollarChange - a.dollarChange);
  const negative = assets.filter((asset) => asset.dollarChange < -EPSILON).sort((a, b) => a.dollarChange - b.dollarChange);
  const overallMainContributor = assets.find((asset) => Math.abs(asset.dollarChange) > EPSILON) ?? null;
  const direction = totalChange > EPSILON ? 'increased' : totalChange < -EPSILON ? 'declined' : 'was effectively unchanged';
  const mainSentence = overallMainContributor
    ? `${overallMainContributor.symbol} had the largest absolute impact at ${formatSignedCurrency(overallMainContributor.dollarChange)}.`
    : 'No asset produced a material portfolio impact.';
  const caveat = hasOffsettingMoves
    ? 'Assets moved in opposite directions. Contribution is shown as share of gross absolute movement; net percentages can exceed 100% or be negative when gains and losses offset.'
    : Math.abs(totalChange) <= EPSILON
      ? 'Net contribution percentages are unavailable because the portfolio change is effectively zero.'
      : null;

  return {
    mode,
    generatedAt,
    previousPortfolioValue,
    currentPortfolioValue,
    totalChange,
    portfolioChangePercentage: previousPortfolioValue === 0 ? null : (totalChange / previousPortfolioValue) * 100,
    grossMovement,
    hasOffsettingMoves,
    contributionBasis: grossMovement <= EPSILON ? 'unavailable' : hasOffsettingMoves ? 'gross' : 'net',
    assets,
    largestPositiveContributor: positive[0] ?? null,
    largestNegativeContributor: negative[0] ?? null,
    overallMainContributor,
    summary: `The portfolio ${direction} by ${formatSignedCurrency(totalChange)} over the comparison period. ${mainSentence} This identifies contribution from holdings and price movement; it does not establish an external market cause.`,
    caveat,
  };
}

export function formatSignedCurrency(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
