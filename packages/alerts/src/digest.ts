import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnv, logger } from '@kfi/shared';
import { clip, postDiscord, type DiscordEmbedField } from './discord.js';

interface TopDemandRow {
  sku_id: string;
  slug: string;
  name_pt: string;
  team_display: string;
  season: string;
  kit_type: string;
  gender_age: string;
  retail_price_eur: number | null;
  in_stock: boolean;
  day: string | null;
  active_listings: number | null;
  sold_30d: number | null;
  sold_7d: number | null;
  sold_today: number | null;
  median_price_eur: number | null;
  median_price_7d_avg: number | null;
  demand_score: number | null;
  recommendation: string | null;
}

const REC_COLOR: Record<string, number> = {
  STOCK: 0x2ecc71, // green
  RAISE: 0xf1c40f, // gold
  HOLD: 0x95a5a6, // grey
  SKIP: 0x7f8c8d, // dark grey
  LIQUIDATE: 0xe74c3c, // red
};

function client(): SupabaseClient {
  const env = loadEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function fmtEur(n: number | null | undefined): string {
  return n == null ? '—' : `€${n.toFixed(2)}`;
}

/** Build a compact one-line summary per SKU, suitable for a Discord field value. */
function lineFor(r: TopDemandRow): string {
  const median = fmtEur(r.median_price_eur);
  const retail = r.retail_price_eur != null ? ` · retail ${fmtEur(r.retail_price_eur)}` : '';
  const stock = r.in_stock ? ' · em stock' : '';
  return clip(
    `**${r.team_display} ${r.season}** (${r.kit_type}/${r.gender_age}) · 30d=${r.sold_30d ?? 0} · supply=${r.active_listings ?? 0} · mediana ${median}${retail}${stock}`,
    1000,
  );
}

function fieldFor(rec: string, rows: TopDemandRow[]): DiscordEmbedField | null {
  if (rows.length === 0) return null;
  const top = rows.slice(0, 8);
  const value = clip(top.map(lineFor).join('\n'), 1000);
  const extra = rows.length > top.length ? `\n+${rows.length - top.length} mais` : '';
  return { name: `${rec} (${rows.length})`, value: clip(value + extra, 1024) };
}

export interface DigestResult {
  day: string | null;
  totals: Record<string, number>;
  sent: boolean;
}

export async function sendDailyDigest(opts: { dry?: boolean } = {}): Promise<DigestResult> {
  const sb = client();
  const env = loadEnv();
  const webhook = env.DISCORD_WEBHOOK_DIGEST || env.DISCORD_WEBHOOK_ALERTS;
  if (!webhook && !opts.dry) {
    throw new Error('DISCORD_WEBHOOK_DIGEST or DISCORD_WEBHOOK_ALERTS must be set');
  }

  const { data, error } = await sb
    .from('top_demand_30d')
    .select('*')
    .limit(200);
  if (error) throw new Error(`top_demand_30d query failed: ${error.message}`);
  const rows = (data ?? []) as TopDemandRow[];

  const byRec: Record<string, TopDemandRow[]> = { STOCK: [], RAISE: [], LIQUIDATE: [], HOLD: [], SKIP: [] };
  for (const r of rows) {
    const k = r.recommendation ?? 'HOLD';
    (byRec[k] ?? (byRec[k] = [])).push(r);
  }
  const totals = Object.fromEntries(Object.entries(byRec).map(([k, v]) => [k, v.length]));
  const day = rows.find((r) => r.day)?.day ?? null;

  const fields: DiscordEmbedField[] = [];
  for (const rec of ['STOCK', 'RAISE', 'LIQUIDATE'] as const) {
    const f = fieldFor(rec, byRec[rec] ?? []);
    if (f) fields.push(f);
  }

  if (fields.length === 0) {
    logger.info({ day, totals }, 'no actionable recommendations today, skipping post');
    return { day, totals, sent: false };
  }

  const payload = {
    username: 'kidsfashion-intel',
    embeds: [
      {
        title: `Digest · ${day ?? 'sem dados'}`,
        description: 'Sinais acionáveis baseados na última corrida do `metrics_daily`.',
        color: REC_COLOR['STOCK'],
        fields,
        footer: { text: 'top_demand_30d · query no Supabase para ver tudo' },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  if (opts.dry) {
    logger.info({ payload }, 'dry run, would post');
    return { day, totals, sent: false };
  }

  await postDiscord(webhook!, payload);
  logger.info({ day, totals }, 'digest posted');

  // Audit trail.
  const { error: logErr } = await sb.from('alerts_log').insert({
    kind: 'digest',
    payload: { day, totals },
    delivered: true,
  });
  if (logErr) logger.warn({ err: logErr.message }, 'alerts_log insert failed (non-fatal)');

  return { day, totals, sent: true };
}
