import type { InvestigationMode, InvestigationResult } from '../types/portfolio';
import { calculateInvestigation } from '../utils/calculations';
import { getMarketEvidence } from './marketService';
import { getPortfolio } from './portfolioService';

export async function investigatePortfolio(mode: InvestigationMode): Promise<InvestigationResult> {
  const holdings = await getPortfolio(mode);
  const markets = await getMarketEvidence(holdings, mode);
  return calculateInvestigation(holdings, markets, mode);
}
