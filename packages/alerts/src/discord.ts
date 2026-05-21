/**
 * Minimal Discord webhook client. Webhook payload spec:
 * https://discord.com/developers/docs/resources/webhook#execute-webhook
 *
 * Embeds have hard limits: 25 fields, 1024 chars per field value, 6000 total
 * chars across an embed, 4096 char description. We keep things conservative.
 */

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

export interface DiscordPayload {
  content?: string;
  username?: string;
  embeds?: DiscordEmbed[];
}

export async function postDiscord(webhook: string, payload: DiscordPayload): Promise<void> {
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Discord webhook ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
}

/** Truncate a string to a hard character cap, adding an ellipsis when cut. */
export function clip(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + '…';
}
