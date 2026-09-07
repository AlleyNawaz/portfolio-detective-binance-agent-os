import { randomUUID } from 'node:crypto';
import type { AgentEvent, InvestigationMode } from '../types/portfolio';
import { PORTFOLIO_DETECTIVE_SYSTEM_PROMPT } from './prompts';
import { executeRegisteredTool, openAITools, type InvestigationContext } from './tools';

interface ModelOutputItem { type: string; name?: string; arguments?: string; call_id?: string; output?: unknown; content?: Array<{ type: string; text?: string }>; }
interface ModelResponse { id: string; output: ModelOutputItem[]; output_text?: string; }
export type AgentEmitter = (event: AgentEvent) => void;

const createEvent = (type: AgentEvent['type'], details: Omit<AgentEvent, 'id' | 'type' | 'timestamp'> = {}): AgentEvent => ({
  id: randomUUID(), type, timestamp: new Date().toISOString(), ...details,
});

export async function runPortfolioAgent(request: string, mode: InvestigationMode, emit: AgentEmitter): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('MISSING_OPENAI_API_KEY');
  const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  const context: InvestigationContext = { mode, holdings: null, markets: new Map(), calculation: null };
  const tools: Array<Record<string, unknown>> = openAITools();
  const mcpToken = process.env.BINANCE_AGENT_OS_MCP_ACCESS_TOKEN;

  if (mcpToken && mode === 'live') tools.push({
    type: 'mcp', server_label: 'binance_agent_os',
    server_url: process.env.BINANCE_AGENT_OS_MCP_URL || 'https://agent.binance.com/mcp/agentic',
    authorization: mcpToken, require_approval: 'never',
    server_description: 'Official Binance Agent OS MCP server. Use read-only market or account capabilities when relevant.',
  });

  let input: unknown = `Investigation mode: ${mode}. User request: ${request}`;
  let previousResponseId: string | undefined;

  for (let turn = 1; turn <= 12; turn += 1) {
    emit(createEvent('agent_thinking', { turn, message: 'Requesting the agent’s next decision.' }));
    const response = await callModel({ apiKey, model, tools, input, previousResponseId });
    previousResponseId = response.id;

    for (const call of response.output.filter((item) => item.type === 'mcp_call')) {
      emit(createEvent('tool_call_completed', { callId: call.call_id, tool: call.name || 'binance_mcp_tool', provenance: 'binance-agent-os', result: summarizeResult(call.output) }));
    }

    const calls = response.output.filter((item) => item.type === 'function_call' && item.name && item.call_id);
    if (!calls.length) {
      const message = extractText(response).trim();
      if (!message) throw new Error('AGENT_RETURNED_NO_MESSAGE');
      emit(createEvent('agent_message', { message }));
      emit(createEvent('investigation_completed', { message, investigation: context.calculation ?? undefined }));
      return;
    }

    const outputs: Array<Record<string, unknown>> = [];
    for (const call of calls) {
      const args = parseArguments(call.arguments);
      const provenance = call.name === 'get_portfolio' || call.name === 'get_market_data' ? 'binance-api-local' : 'local';
      emit(createEvent('tool_call_started', { callId: call.call_id, tool: call.name, provenance, input: args }));
      try {
        const execution = await executeRegisteredTool(call.name!, args, context);
        emit(createEvent('tool_call_completed', { callId: call.call_id, tool: call.name, provenance: execution.provenance, input: args, result: execution.result }));
        outputs.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(execution.result) });
      } catch (error) {
        const code = error instanceof Error ? error.message : 'TOOL_EXECUTION_FAILED';
        emit(createEvent('tool_call_failed', { callId: call.call_id, tool: call.name, provenance, input: args, result: { error: code } }));
        outputs.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify({ error: code }) });
      }
    }
    input = outputs;
  }
  throw new Error('AGENT_MAX_TURNS_EXCEEDED');
}

async function callModel(params: { apiKey: string; model: string; tools: Array<Record<string, unknown>>; input: unknown; previousResponseId?: string }): Promise<ModelResponse> {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${params.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: params.model, instructions: PORTFOLIO_DETECTIVE_SYSTEM_PROMPT, input: params.input, tools: params.tools, previous_response_id: params.previousResponseId, parallel_tool_calls: true }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error('[Portfolio Detective] model request failed', response.status, detail.slice(0, 800));
    throw new Error(response.status === 429 ? 'OPENAI_RATE_LIMIT' : `OPENAI_REQUEST_FAILED:${response.status}`);
  }
  return response.json() as Promise<ModelResponse>;
}

function parseArguments(value?: string): Record<string, unknown> {
  if (!value) return {};
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('INVALID_TOOL_ARGUMENTS');
  return parsed as Record<string, unknown>;
}

function summarizeResult(value: unknown): unknown {
  return typeof value === 'string' && value.length > 600 ? `${value.slice(0, 600)}…` : value;
}

function extractText(response: ModelResponse): string {
  if (response.output_text) return response.output_text;
  return response.output.flatMap((item) => item.content ?? []).filter((item) => item.type === 'output_text').map((item) => item.text ?? '').join('\n');
}
