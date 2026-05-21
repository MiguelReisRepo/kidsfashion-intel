import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DRY_RUN: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),

  EBAY_CLIENT_ID: z.string().optional(),
  EBAY_CLIENT_SECRET: z.string().optional(),
  EBAY_MARKETPLACE_ID: z.string().default('EBAY_GB'),

  ALIEXPRESS_APP_KEY: z.string().optional(),
  ALIEXPRESS_APP_SECRET: z.string().optional(),

  AMAZON_ACCESS_KEY: z.string().optional(),
  AMAZON_SECRET_KEY: z.string().optional(),
  AMAZON_ASSOCIATE_TAG: z.string().optional(),
  AMAZON_MARKETPLACE: z.string().default('www.amazon.es'),

  MERCADOLIVRE_APP_ID: z.string().optional(),
  MERCADOLIVRE_CLIENT_SECRET: z.string().optional(),

  FIRECRAWL_API_KEY: z.string().optional(),

  DISCORD_WEBHOOK_ALERTS: z.string().url().optional(),
  DISCORD_WEBHOOK_DIGEST: z.string().url().optional(),

  KIDSFASHION_SEED_URL: z
    .string()
    .url()
    .default('https://raw.githubusercontent.com/MiguelReisRepo/KidsFashionClub/main/src/data/seed.ts'),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${parsed.error.issues
        .map((i) => `  ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    );
  }
  cached = parsed.data;
  return cached;
}

export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = loadEnv()[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Required env var missing: ${String(key)}`);
  }
  return value as never;
}
