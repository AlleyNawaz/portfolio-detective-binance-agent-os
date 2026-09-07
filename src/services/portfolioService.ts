import { createHmac } from 'node:crypto';
import { DEMO_HOLDINGS } from '../data/demo';
import type { InvestigationMode, PortfolioHolding } from '../types/portfolio';

const BINANCE_API_BASE = 'https://api.binance.com';

export async function getPortfolio(mode: InvestigationMode): Promise<PortfolioHolding[]> {
  if (mode === 'demo') return DEMO_HOLDINGS;

  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error('MISSING_BINANCE_CREDENTIALS');

  const query = new URLSearchParams({ timestamp: Date.now().toString(), recvWindow: '5000' }).toString();
  const signature = createHmac('sha256', apiSecret).update(query).digest('hex');
  const response = await fetch(`${BINANCE_API_BASE}/api/v3/account?${query}&signature=${signature}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  if (!response.ok) throw await binanceError('PORTFOLIO_UNAVAILABLE', response);
  const payload = (await response.json()) as { balances?: Array<{ asset: string; free: string; locked: string }> };
  const holdings = (payload.balances ?? [])
    .map((balance) => ({ symbol: balance.asset, quantity: Number(balance.free) + Number(balance.locked) }))
    .filter((holding) => holding.quantity > 0 && holding.symbol !== 'USDT');
  if (holdings.length === 0) throw new Error('EMPTY_PORTFOLIO');
  return holdings;
}

async function binanceError(prefix: string, response: Response): Promise<Error> {
  const detail = await response.text();
  console.error(`[Binance] ${prefix}`, response.status, detail);
  if (response.status === 429 || response.status === 418) return new Error('BINANCE_RATE_LIMIT');
  return new Error(`${prefix}:${response.status}`);
}
