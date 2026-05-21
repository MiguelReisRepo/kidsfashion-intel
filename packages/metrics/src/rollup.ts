import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnv, logger } from '@kfi/shared';

export interface RollupResult {
  day: string;
  staleHours: number;
  soldSignals: number;
  priceSnapshots: number;
  metricsSkus: number;
}

function client(): SupabaseClient {
  const env = loadEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for metrics rollup');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * The three RPCs each return a single-row table with one BIGINT count. The
 * Supabase JS client surfaces that as `[{ <col>: number }]`. Read the first
 * row defensively in case future PG versions change shape.
 */
function readCount(data: unknown, key: string): number {
  if (Array.isArray(data) && data.length > 0) {
    const row = data[0] as Record<string, unknown>;
    const value = row?.[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number.parseInt(value, 10) || 0;
  }
  return 0;
}

export async function runDailyRollup(opts: { day?: string; staleHours?: number } = {}): Promise<RollupResult> {
  const day = opts.day ?? new Date().toISOString().slice(0, 10);
  const staleHours = opts.staleHours ?? 48;
  const sb = client();

  logger.info({ day, staleHours }, 'metrics rollup starting');

  const { data: signalsData, error: signalsErr } = await sb.rpc('kfi_infer_sold_signals', { p_stale_hours: staleHours });
  if (signalsErr) throw new Error(`kfi_infer_sold_signals failed: ${signalsErr.message}`);
  const soldSignals = readCount(signalsData, 'inferred_count');
  logger.info({ soldSignals }, 'sold signals inferred');

  const { data: snapsData, error: snapsErr } = await sb.rpc('kfi_compute_price_snapshots', { p_day: day });
  if (snapsErr) throw new Error(`kfi_compute_price_snapshots failed: ${snapsErr.message}`);
  const priceSnapshots = readCount(snapsData, 'snapshot_count');
  logger.info({ priceSnapshots }, 'price snapshots written');

  const { data: metricsData, error: metricsErr } = await sb.rpc('kfi_compute_metrics_daily', { p_day: day });
  if (metricsErr) throw new Error(`kfi_compute_metrics_daily failed: ${metricsErr.message}`);
  const metricsSkus = readCount(metricsData, 'sku_count');
  logger.info({ metricsSkus }, 'metrics_daily computed');

  return { day, staleHours, soldSignals, priceSnapshots, metricsSkus };
}
