import { loadConfig } from './config.js';
import { SwapAggregator, MetricsRegistry } from './metrics.js';
import { extractSwapObservation } from './parser.js';
import { startLaserstreamBackedWebSocket } from './stream.js';

const config = loadConfig();
const registry = new MetricsRegistry();
const aggregator = new SwapAggregator(registry);

registry.listen(config.metricsPort);

console.log(`Starting DEX monitor for ${config.programFilters.map((entry) => entry.name).join(', ')}`);
console.log(`Commitment: ${config.commitment}`);
console.log(`Metrics endpoint: http://localhost:${config.metricsPort}/metrics`);

startLaserstreamBackedWebSocket(config, (message) => {
  const swap = extractSwapObservation(message, config.programFilters);

  if (!swap) {
    return;
  }

  aggregator.observe(swap);
  console.log(`[${swap.dex}] ${swap.pair} price=${swap.price.toFixed(6)} baseVolume=${swap.baseVolume.toFixed(6)} quoteVolume=${swap.quoteVolume.toFixed(6)} sig=${swap.signature}`);
});
