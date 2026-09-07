import type { InvestigationMode } from '../types/portfolio';
import { portfolioInvestigationTool } from './tools';

export async function runPortfolioAgent(mode: InvestigationMode) {
  return portfolioInvestigationTool.execute({ mode });
}
