import { runPortfolioAgent } from '../../../src/agent/portfolioAgent';
import type { AgentEvent, InvestigationMode } from '../../../src/types/portfolio';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { message?: unknown; mode?: unknown };
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const mode: InvestigationMode = body.mode === 'live' ? 'live' : 'demo';
  if (!message) return Response.json({ error: 'Enter an investigation request.' }, { status: 400 });
  if (message.length > 2000) return Response.json({ error: 'Keep the request under 2,000 characters.' }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (agentEvent: AgentEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(agentEvent)}\n\n`));
      try {
        await runPortfolioAgent(message, mode, send);
      } catch (error) {
        const code = error instanceof Error ? error.message : 'AGENT_FAILED';
        console.error('[Portfolio Detective] agent failed', code);
        send({ id: crypto.randomUUID(), type: 'error', timestamp: new Date().toISOString(), message: friendlyMessage(code) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' } });
}

function friendlyMessage(code: string) {
  if (code === 'MISSING_OPENAI_API_KEY') return 'The agent is not configured. Add OPENAI_API_KEY to the server environment.';
  if (code === 'MISSING_BINANCE_CREDENTIALS') return 'Live Mode needs read-only Binance API credentials.';
  if (code === 'OPENAI_RATE_LIMIT') return 'The agent model is rate-limited. Try again shortly.';
  if (code.startsWith('OPENAI_REQUEST_FAILED')) return 'The model request failed. Check the server model and API key configuration.';
  return `Investigation paused: ${code}`;
}
