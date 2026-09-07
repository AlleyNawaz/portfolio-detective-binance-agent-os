import { runPortfolioAgent } from './portfolioAgent';

const mode = process.argv.includes('--live') ? 'live' : 'demo';
const request = process.argv.filter((argument) => !argument.startsWith('--')).slice(2).join(' ') || 'Investigate why my portfolio changed in the last 24 hours.';

try {
  await runPortfolioAgent(request, mode, (event) => process.stdout.write(`${JSON.stringify(event)}\n`));
} catch (error) {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  process.stderr.write(`Portfolio investigation failed: ${message}\n`);
  process.exitCode = 1;
}
