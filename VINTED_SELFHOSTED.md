# Running the Vinted scraper from home

Vinted is behind Datadome. GitHub-hosted runners (Azure datacenter IPs) get challenged on the very first HTTP call and never receive a `_vinted_fr_session` cookie. The adapter works fine from a residential IP, so the `fetch-vinted` workflow targets `runs-on: [self-hosted, vinted]` — you register a runner on your own machine and the workflow runs there.

## One-time setup (~10 min)

You only need to do this on one machine (Mac, Windows, Linux, Raspberry Pi). It can be your daily-driver computer; the runner only wakes up when GitHub fires the cron.

### 1 · Install the GitHub Actions runner

GitHub → repo → Settings → Actions → Runners → **New self-hosted runner**.

Pick your OS, then follow the shell snippet GitHub gives you. It looks like:

```bash
mkdir actions-runner && cd actions-runner
curl -o actions-runner-osx-arm64-2.x.tar.gz -L https://github.com/actions/runner/releases/...
tar xzf actions-runner-osx-arm64-2.x.tar.gz
./config.sh --url https://github.com/MiguelReisRepo/kidsfashion-intel --token <one-time-token>
```

When `config.sh` asks for **labels**, type: `vinted` (in addition to the defaults). This is what matches the `runs-on: [self-hosted, vinted]` in the workflow.

### 2 · Run it as a service (so it survives reboots)

**macOS:**
```bash
./svc.sh install
./svc.sh start
./svc.sh status   # confirm "active"
```

**Linux (incl. Raspberry Pi):**
```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo systemctl status actions.runner.*
```

**Windows:** run `config.cmd` as Administrator and pick "Run as a service" during setup.

### 3 · Install Node 22 on that machine

Node 22 is the only runtime requirement. Use `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 22
```

The runner picks Node up from PATH; no per-job setup needed beyond what the workflow already does.

### 4 · Smoke test

GitHub → Actions → `fetch-vinted` → **Run workflow**, check `dry_run`. Watch the logs.

Expected log lines:
```
vinted session refresh
vinted session ok
search ok q=Portugal 2026/27 found=12
search ok q=FC Barcelona 2026/27 found=24
...
runner finished
```

If you see `vinted homepage 403 (likely Datadome — confirm IP type)`:

- Your IP got scored. Wait an hour, change network (mobile hotspot), and retry.
- Or check that the runner is actually on your home network (not a VPN/datacenter).

## Day-2 operations

**The session refresh fails periodically.** Datadome rolls out new fingerprinting checks every few months. When that happens you'll see the same `403 (likely Datadome)` error consistently. Fix path:

1. Update the realistic User-Agent in `packages/scrapers/src/vinted/client.ts` to a current Chrome version.
2. If that's not enough, switch to a stealth browser library (`patchright` or `camoufox`) for the homepage step only — keep the JSON API calls on plain `fetch` since the cookie is what they care about.

**Polite cadence is non-negotiable.** Hammering Vinted from a single residential IP gets it scored quickly. The workflow runs every 4h with 4s delay between queries — that's already conservative. Don't lower it.

**You can pause anytime.** Stop the runner (`./svc.sh stop`) and the workflow simply queues — it will not run on a GitHub-hosted fallback. Restart when ready.

## Why not just use a proxy?

You can, and the adapter accepts proxies via `HTTPS_PROXY` env var (Node's fetch honours it). But for ~80 queries × 4 runs/day = 320 requests, free residential proxy tiers (Webshare 1GB/month free) are enough, and a self-hosted runner is even simpler since you skip credentials entirely.
