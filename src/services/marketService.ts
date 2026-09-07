import { DEMO_MARKET_EVIDENCE } from '../data/demo';
import type { InvestigationMode, MarketEvidence, PortfolioHolding } from '../types/portfolio';

const BINANCE_API_BASE = 'https://api.binance.com';
const STABLE_ASSETS = new Set(['USDT', 'USDC', 'FDUSD']);

export async function getMarketEvidence(holdings: PortfolioHolding[], mode: InvestigationMode): Promise<MarketEvidence[]> {
  if (mode === 'demo') return DEMO_MARKET_EVIDENCE.filter((market) => holdings.some((h) => h.symbol === market.symbol));
  return Promise.all(holdings.map(getLiveEvidence));
}

export async function getMarketData(symbol: string, mode: InvestigationMode, comparisonPeriod: '24h'): Promise<MarketEvidence> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) throw new Error('INVALID_SYMBOL');
  if (comparisonPeriod !== '24h') throw new Error('UNSUPPORTED_COMPARISON_PERIOD');
  if (mode === 'demo') {
    const evidence = DEMO_MARKET_EVIDENCE.find((market) => market.symbol === normalized);
    if (!evidence) throw new Error(`MARKET_DATA_UNAVAILABLE:${normalized}`);
    return evidence;
  }
  return getLiveEvidence({ symbol: normalized, quantity: 0 });
}

async function getLiveEvidence(holding: PortfolioHolding): Promise<MarketEvidence> {
  if (STABLE_ASSETS.has(holding.symbol)) {
    return { symbol: holding.symbol, pair: holding.symbol, currentPrice: 1, previousPrice: 1, source: 'binance-spot-api', comparisonLabel: 'USD stable-asset assumption' };
  }
  const pair = `${holding.symbol}USDT`;
  const [tickerResponse, candlesResponse] = await Promise.all([
    fetch(`${BINANCE_API_BASE}/api/v3/ticker/price?symbol=${encodeURIComponent(pair)}`),
    fetch(`${BINANCE_API_BASE}/api/v3/klines?symbol=${encodeURIComponent(pair)}&interval=1d&limit=2`),
  ]);
  if (!tickerResponse.ok || !candlesResponse.ok) {
    console.error('[Binance] market evidence unavailable', holding.symbol, tickerResponse.status, candlesResponse.status);
    if (tickerResponse.status === 429 || candlesResponse.status === 429) throw new Error('BINANCE_RATE_LIMIT');
    throw new Error(`UNSUPPORTED_MARKET_PAIR:${pair}`);
  }
  const ticker = (await tickerResponse.json()) as { price: string };
  const candles = (await candlesResponse.json()) as unknown[][];
  if (candles.length < 2) throw new Error(`MARKET_DATA_UNAVAILABLE:${pair}`);
  return {
    symbol: holding.symbol,
    pair,
    currentPrice: Number(ticker.price),
    previousPrice: Number(candles[0][4]),
    source: 'binance-spot-api',
    comparisonLabel: 'Previous completed daily close',
  };
}
