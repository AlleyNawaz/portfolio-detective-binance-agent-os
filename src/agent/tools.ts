import type { InvestigationMode, InvestigationResult } from '../types/portfolio';
import { investigatePortfolio } from '../services/investigationService';

export const portfolioInvestigationTool = {
  name: 'investigate_portfolio',
  description: 'Collect portfolio and Binance market evidence, then return deterministic contribution analysis.',
  async execute(input: { mode: InvestigationMode }): Promise<InvestigationResult> {
    return investigatePortfolio(input.mode);
  },
};
