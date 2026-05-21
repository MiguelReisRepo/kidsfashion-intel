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

export function recColor(rec: string | null): string {
  switch (rec) {
    case 'STOCK': return 'bg-emerald-500 text-emerald-50';
    case 'RAISE': return 'bg-amber-500 text-amber-50';
    case 'LIQUIDATE': return 'bg-rose-500 text-rose-50';
    case 'SKIP': return 'bg-zinc-700 text-zinc-300';
    default: return 'bg-zinc-800 text-zinc-400';
  }
}
