import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentEvent } from '../types/portfolio';
import { runPortfolioAgent } from './portfolioAgent';

describe('runPortfolioAgent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
  });

  it('executes the tools chosen by the model and returns their results to the model', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const modelResponses = [
      response('r1', [call('c1', 'get_portfolio', {})]),
      response('r2', ['BTC', 'ETH', 'BNB', 'SOL'].map((symbol, index) => call(`c${index + 2}`, 'get_market_data', { symbol, comparisonPeriod: '24h' }))),
      response('r3', [call('c6', 'calculate_portfolio_contribution', {})]),
      response('r4', [{ type: 'message', content: [{ type: 'output_text', text: 'Case closed. ETH had the largest negative impact.' }] }]),
    ];
    const fetchMock = vi.fn(async (_input: unknown, _init?: RequestInit) => new Response(JSON.stringify(modelResponses.shift()), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const events: AgentEvent[] = [];

    await runPortfolioAgent('Investigate why my portfolio changed in the last 24 hours.', 'demo', (event) => events.push(event));

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(events.filter((event) => event.type === 'tool_call_started').map((event) => event.tool)).toEqual([
      'get_portfolio', 'get_market_data', 'get_market_data', 'get_market_data', 'get_market_data', 'calculate_portfolio_contribution',
    ]);
    expect(events.at(-1)?.type).toBe('investigation_completed');
    expect(events.at(-1)?.investigation?.overallMainContributor?.symbol).toBe('ETH');
    const secondBody = fetchMock.mock.calls[1]?.[1]?.body;
    expect(typeof secondBody).toBe('string');
    const secondRequest = JSON.parse(secondBody as string) as { input: Array<{ call_id: string }> };
    expect(secondRequest.input[0].call_id).toBe('c1');
  });
});

function call(callId: string, name: string, args: object) {
  return { type: 'function_call', call_id: callId, name, arguments: JSON.stringify(args) };
}

function response(id: string, output: object[]) { return { id, output }; }
