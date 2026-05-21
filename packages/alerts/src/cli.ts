import { loadEnv, logger } from '@kfi/shared';
import { sendDailyDigest } from './digest.js';

interface CliOptions {
  dry: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { dry: false };
  for (const arg of argv) {
    if (arg === '--dry') opts.dry = true;
  }
  return opts;
}

async function main(): Promise<void> {
  loadEnv();
  const opts = parseArgs(process.argv.slice(2));
  const result = await sendDailyDigest(opts);
  logger.info(result, 'digest run finished');
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'digest run failed');
  process.exitCode = 1;
});
