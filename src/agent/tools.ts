import { getMarketData } from '../services/marketService';
import { getPortfolio } from '../services/portfolioService';
import type { InvestigationMode, InvestigationResult, MarketEvidence, PortfolioHolding, ToolProvenance } from '../types/portfolio';
import { calculateInvestigation } from '../utils/calculations';

export interface InvestigationContext {
  mode: InvestigationMode;
  holdings: PortfolioHolding[] | null;
  markets: Map<string, MarketEvidence>;
  calculation: InvestigationResult | null;
}

export interface RegisteredTool {
  name: string;
  description: string;
  provenance: ToolProvenance;
  parameters: Record<string, unknown>;
  execute(args: Record<string, unknown>, context: InvestigationContext): Promise<unknown>;
}

const noArguments = { type: 'object', properties: {}, required: [], additionalProperties: false };

export const toolRegistry: RegisteredTool[] = [
  {
    name: 'get_portfolio',
    description: 'Retrieve the portfolio holdings for this investigation. Call this before making claims about user holdings.',
    provenance: 'binance-api-local', parameters: noArguments,
    async execute(_args, context) {
      context.holdings = await getPortfolio(context.mode);
      return { mode: context.mode, simulated: context.mode === 'demo', assets: context.holdings };
    },
  },
  {
    name: 'get_market_data',
    description: 'Retrieve Binance market evidence for one asset over the requested comparison period.',
    provenance: 'binance-api-local',
    parameters: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Asset symbol such as BTC or ETH.' },
        comparisonPeriod: { type: 'string', enum: ['24h'], description: 'Comparison period.' },
      },
      required: ['symbol', 'comparisonPeriod'], additionalProperties: false,
    },
    async execute(args, context) {
      const market = await getMarketData(String(args.symbol), context.mode, args.comparisonPeriod as '24h');
      context.markets.set(market.symbol, market);
      return market;
    },
  },
  {
    name: 'calculate_portfolio_contribution',
    description: 'Calculate portfolio movement and asset contributions from evidence already retrieved. This deterministic tool is the only source of truth for contribution math.',
    provenance: 'local', parameters: noArguments,
    async execute(_args, context) {
      if (!context.holdings) throw new Error('PORTFOLIO_EVIDENCE_REQUIRED');
      const missing = context.holdings.filter((holding) => !context.markets.has(holding.symbol)).map((holding) => holding.symbol);
      if (missing.length) throw new Error(`MARKET_EVIDENCE_REQUIRED:${missing.join(',')}`);
      context.calculation = calculateInvestigation(context.holdings, [...context.markets.values()], context.mode);
      return context.calculation;
    },
  },
  {
    name: 'get_investigation_context',
    description: 'Inspect evidence already collected during this investigation without retrieving it again.',
    provenance: 'local', parameters: noArguments,
    async execute(_args, context) {
      return { mode: context.mode, holdings: context.holdings, marketSymbols: [...context.markets.keys()], calculation: context.calculation };
    },
  },
];

export function openAITools() {
  return toolRegistry.map((tool) => ({ type: 'function', name: tool.name, description: tool.description, parameters: tool.parameters, strict: true }));
}

export async function executeRegisteredTool(name: string, args: Record<string, unknown>, context: InvestigationContext) {
  const tool = toolRegistry.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`UNKNOWN_TOOL:${name}`);
  return { result: await tool.execute(args, context), provenance: tool.provenance };
}
