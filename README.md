# Real-Time DEX Monitor

This repo contains a lightweight dashboard starter for monitoring Jupiter and Raydium swaps with **Helius LaserStream gRPC**, then exporting aggregated metrics into Prometheus and Grafana.

## Why this version uses LaserStream directly

The monitor now uses the official `helius-laserstream` SDK instead of the `transactionSubscribe` WebSocket method. That means the stream is actually driven by LaserStream gRPC filters and inherits the SDK's automatic reconnect/replay behavior.

## What it does

- Subscribes to **LaserStream gRPC transaction updates** with `vote: false` and `failed: false`.
- Filters by Jupiter and/or Raydium program IDs via `accountInclude`, with optional `accountExclude` and `accountRequired` controls.
- Derives swap-like token balance deltas from `preTokenBalances` and `postTokenBalances` in the LaserStream transaction metadata.
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

1. Install dependencies.

   ```bash
   npm install
   ```

2. Copy the sample environment file.

   ```bash
   cp .env.example .env
   ```

3. Set `HELIUS_API_KEY` in `.env`.
4. Start the LaserStream monitor.

   ```bash
   set -a && source .env && set +a && npm start
   ```

5. In another shell, start Grafana and Prometheus.

   ```bash
   docker compose up -d
   ```

6. Open Grafana at <http://localhost:3000>.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `HELIUS_API_KEY` | _(required)_ | Helius API key used for LaserStream gRPC authentication. |
| `LASERSTREAM_GRPC_ENDPOINT` | `https://laserstream-mainnet-ewr.helius-rpc.com` | LaserStream gRPC endpoint. |
| `DEX_PROGRAMS` | `jupiter,raydium-clmm` | Comma-separated built-in aliases or raw program IDs. |
| `COMMITMENT` | `confirmed` | Stream commitment level. |
| `ACCOUNT_INCLUDE` | empty | Additional include accounts appended to DEX program IDs. |
| `ACCOUNT_EXCLUDE` | empty | Accounts to exclude from the subscription. |
| `ACCOUNT_REQUIRED` | empty | Accounts that must all be present. |
| `METRICS_PORT` | `9464` | Local metrics exporter port. |

## Data flow

1. `src/stream.js` builds a LaserStream `SubscribeRequest` using the `transactions` filter map and `CommitmentLevel` enum.
2. `src/parser.js` handles the gRPC transaction update shape, decodes byte-array account keys/signatures, and estimates the sold and bought legs of a swap from token balance changes.
3. `src/metrics.js` aggregates the events into minute buckets and exposes Prometheus-formatted metrics.
4. `grafana/dashboards/dex-monitor.json` visualizes price, volume, slot freshness, and swap count.

## Terminal output on startup

On startup you should see lines like:

```text
Starting LaserStream DEX monitor for jupiter, raydium-clmm
LaserStream endpoint: https://laserstream-mainnet-ewr.helius-rpc.com
Commitment: confirmed
Metrics endpoint: http://localhost:9464/metrics
```

Whenever a matching swap is detected, the monitor logs a single concise event line with the DEX name, slot, pair, price, volumes, and signature.

## Notes for practicing LaserStream concepts

- **High-velocity streams:** the monitor is designed around streaming updates and incremental aggregation rather than storing full transaction payloads.
- **Commitment levels:** the default is `confirmed` because it balances speed and reliability for dashboards, but you can switch to `processed` or `finalized`.
- **Filter logic:** use `ACCOUNT_REQUIRED` when you want an AND condition and `ACCOUNT_EXCLUDE` when you want to cut out known noise sources.
- **Shred-level ingestion mindset:** the dashboard pipeline keeps ingestion, parsing, and aggregation separate so you can focus on how LaserStream delivery feeds downstream metrics and visualizations.

## Tests

Run the built-in test suite:

```bash
npm test
```
