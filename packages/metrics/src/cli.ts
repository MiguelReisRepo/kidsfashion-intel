import { loadEnv, logger } from '@kfi/shared';
import { runDailyRollup } from './rollup.js';

interface CliOptions {
  day: string | undefined;
  staleHours: number;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { day: undefined, staleHours: 48 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--day') {
      const next = argv[++i];
      if (!next) throw new Error('--day needs a value (YYYY-MM-DD)');
      opts.day = next;
    } else if (arg === '--stale-hours') {
      const next = argv[++i];
      if (!next) throw new Error('--stale-hours needs a value');
      opts.staleHours = Number.parseInt(next, 10);
    }
  }
  return opts;
}

async function main(): Promise<void> {
  loadEnv();
  const opts = parseArgs(process.argv.slice(2));
  const result = await runDailyRollup(opts);
  logger.info(result, 'metrics rollup finished');
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'metrics rollup failed');
  process.exitCode = 1;
});
