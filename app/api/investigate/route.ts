import { investigatePortfolio } from '../../../src/services/investigationService';
import type { InvestigationMode } from '../../../src/types/portfolio';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { mode?: InvestigationMode };
    const mode: InvestigationMode = body.mode === 'live' ? 'live' : 'demo';
    const result = await investigatePortfolio(mode);
    return Response.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    console.error('[Portfolio Detective] investigation failed', code);
    const friendly = friendlyMessage(code);
    return Response.json({ error: friendly, code }, { status: code.startsWith('MISSING_') ? 400 : 502 });
  }
}

function friendlyMessage(code: string): string {
  if (code === 'MISSING_BINANCE_CREDENTIALS') return 'Live investigation needs Binance API credentials. Add them to your local .env file or switch to Demo Mode.';
  if (code === 'EMPTY_PORTFOLIO') return 'No supported assets were found in this portfolio.';
  if (code === 'BINANCE_RATE_LIMIT') return 'Binance is rate-limiting requests. Please pause briefly and try again.';
  if (code.startsWith('UNSUPPORTED_MARKET_PAIR')) return `Investigation paused. ${code.split(':')[1]} is not a supported USDT market pair.`;
  return 'Investigation paused. Portfolio or market evidence could not be retrieved.';
}
