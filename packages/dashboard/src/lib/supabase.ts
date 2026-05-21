import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Server-side Supabase client. Uses the service role key so reads aren't gated
 * by RLS. Never imported by a `client:*` directive — pages are SSG and queries
 * run at build time.
 */
export function supabase(): SupabaseClient {
  if (cached) return cached;
  const url = import.meta.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for dashboard build');
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

export function fmtEur(n: number | null | undefined): string {
  return n == null ? '—' : `€${n.toFixed(2)}`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const d = Math.round(hr / 24);
  if (d < 30) return `há ${d}d`;
  const mo = Math.round(d / 30);
  return `há ${mo} mês${mo === 1 ? '' : 'es'}`;
}

export function recColor(rec: string | null): string {
  switch (rec) {
    case 'STOCK': return 'bg-emerald-500 text-emerald-50';
    case 'RAISE': return 'bg-amber-500 text-amber-50';
    case 'LIQUIDATE': return 'bg-rose-500 text-rose-50';
    case 'SKIP': return 'bg-zinc-700 text-zinc-300';
    default: return 'bg-zinc-800 text-zinc-400';
  }
}
