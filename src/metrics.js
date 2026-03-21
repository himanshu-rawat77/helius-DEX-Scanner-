import http from 'node:http';

function labelString(labels) {
  const entries = Object.entries(labels || {});
  if (!entries.length) {
    return '';
  }

  const serialized = entries.map(([key, value]) => `${key}="${String(value).replaceAll('"', '\\"')}"`).join(',');
  return `{${serialized}}`;
}

export class MetricsRegistry {
  constructor() {
    this.counters = new Map();
    this.gauges = new Map();
  }

  incrementCounter(name, labels, value = 1) {
    const key = `${name}${labelString(labels)}`;
    const current = this.counters.get(key) || { name, labels, value: 0 };
    current.value += value;
    this.counters.set(key, current);
  }

  setGauge(name, labels, value) {
    const key = `${name}${labelString(labels)}`;
    this.gauges.set(key, { name, labels, value });
  }

  render() {
    const lines = [];

    for (const metric of this.counters.values()) {
      lines.push(`${metric.name}${labelString(metric.labels)} ${metric.value}`);
    }

    for (const metric of this.gauges.values()) {
      lines.push(`${metric.name}${labelString(metric.labels)} ${metric.value}`);
    }

    return `${lines.join('\n')}\n`;
  }

  listen(port) {
    const server = http.createServer((request, response) => {
      if (request.url !== '/metrics') {
        response.writeHead(404);
        response.end('Not found');
        return;
      }

      response.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' });
      response.end(this.render());
    });

    server.listen(port);
    return server;
  }
}

export class SwapAggregator {
  constructor(registry) {
    this.registry = registry;
    this.minuteBuckets = new Map();
  }

  observe(swap) {
    const minute = swap.observedAt.slice(0, 16);
    const bucketKey = `${minute}:${swap.dex}:${swap.pair}`;
    const bucket = this.minuteBuckets.get(bucketKey) || { baseVolume: 0, quoteVolume: 0, swaps: 0 };
    bucket.baseVolume += swap.baseVolume;
    bucket.quoteVolume += swap.quoteVolume;
    bucket.swaps += 1;
    this.minuteBuckets.set(bucketKey, bucket);

    const labels = { dex: swap.dex, pair: swap.pair, base_mint: swap.baseMint, quote_mint: swap.quoteMint };
    this.registry.incrementCounter('dex_swaps_total', labels, 1);
    this.registry.incrementCounter('dex_base_volume_total', labels, swap.baseVolume);
    this.registry.incrementCounter('dex_quote_volume_total', labels, swap.quoteVolume);
    this.registry.setGauge('dex_last_price', labels, swap.price);
    this.registry.setGauge('dex_last_seen_slot', labels, swap.slot);
    this.registry.setGauge('dex_swaps_per_minute', labels, bucket.swaps);
    this.registry.setGauge('dex_base_volume_per_minute', labels, bucket.baseVolume);
    this.registry.setGauge('dex_quote_volume_per_minute', labels, bucket.quoteVolume);
  }
}
