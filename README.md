# Real-Time DEX Monitor

This repo contains a lightweight dashboard starter for monitoring Jupiter and Raydium swaps with Helius' LaserStream-style transaction filters, then exporting aggregated metrics into Prometheus and Grafana.

## What it does

- Subscribes to confirmed transactions with `vote: false` and `failed: false`.
- Filters by Jupiter and/or Raydium program IDs via `accountInclude`, with optional `accountExclude` and `accountRequired` controls.
- Derives swap-like token balance deltas from `preTokenBalances` and `postTokenBalances`.
- Exposes per-pair metrics such as swaps/minute, base volume/minute, last price, and last seen slot on `/metrics`.
- Ships a ready-to-import Grafana dashboard and Docker Compose stack for Prometheus + Grafana.

## Supported program aliases

| Alias | Program ID |
| --- | --- |
| `jupiter` | `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4` |
| `raydium-amm-v4` | `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8` |
| `raydium-clmm` | `CAMMCzo5YL8w4VFF8KVHrK22GGUQpMpTFb6xRmpLFGNnSm` |
| `raydium-cpmm` | `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQBpME8xQ` |

## Quick start

1. Copy the sample environment file.

   ```bash
   cp .env.example .env
   ```

2. Set `HELIUS_API_KEY` in `.env`.
3. Start the Node monitor.

   ```bash
   set -a && source .env && set +a && npm start
   ```

4. In another shell, start Grafana and Prometheus.

   ```bash
   docker compose up -d
   ```

5. Open Grafana at <http://localhost:3000>.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `HELIUS_API_KEY` | _(required for default endpoint)_ | Helius API key used for the LaserStream-backed WebSocket. |
| `LASERSTREAM_WS_ENDPOINT` | `wss://mainnet.helius-rpc.com/?api-key=` | Base WebSocket endpoint. |
| `DEX_PROGRAMS` | `jupiter,raydium-clmm` | Comma-separated built-in aliases or raw program IDs. |
| `COMMITMENT` | `confirmed` | Stream commitment level. |
| `ACCOUNT_INCLUDE` | empty | Additional include accounts appended to DEX program IDs. |
| `ACCOUNT_EXCLUDE` | empty | Accounts to exclude from the subscription. |
| `ACCOUNT_REQUIRED` | empty | Accounts that must all be present. |
| `METRICS_PORT` | `9464` | Local metrics exporter port. |

## Data flow

1. `src/stream.js` builds a `transactionSubscribe` request using `accountInclude`, `accountExclude`, `accountRequired`, `vote: false`, and `failed: false`.
2. `src/parser.js` inspects `preTokenBalances` and `postTokenBalances` to estimate the sold and bought legs of a swap.
3. `src/metrics.js` aggregates the events into minute buckets and exposes Prometheus-formatted metrics.
4. `grafana/dashboards/dex-monitor.json` visualizes price, volume, slot freshness, and swap count.

## Notes for practicing LaserStream concepts

- **High-velocity streams:** the monitor is designed around streaming updates and incremental aggregation rather than storing full transaction payloads.
- **Commitment levels:** the default is `confirmed` because it balances speed and reliability for dashboards, but you can switch to `processed` or `finalized`.
- **Filter logic:** use `ACCOUNT_REQUIRED` when you want an AND condition and `ACCOUNT_EXCLUDE` when you want to cut out known noise sources.
- **Shred-level ingestion mindset:** the dashboard pipeline keeps ingestion, parsing, and aggregation separate so you can later replace the WebSocket transport with the native `helius-laserstream` SDK without changing the parser or Grafana layer.

## Tests

Run the built-in test suite:

```bash
npm test
```
