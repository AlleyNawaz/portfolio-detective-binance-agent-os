import { runPortfolioAgent } from './portfolioAgent';

const mode = process.argv.includes('--live') ? 'live' : 'demo';

try {
  const result = await runPortfolioAgent(mode);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  process.stderr.write(`Portfolio investigation failed: ${message}\n`);
  process.exitCode = 1;
}
