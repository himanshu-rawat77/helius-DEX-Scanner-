import { DEFAULT_COMMITMENT, DEFAULT_ENDPOINT, DEFAULT_METRICS_PORT, DEX_PROGRAMS } from './constants.js';

function parseProgramSelection(rawValue) {
  const requested = (rawValue || 'jupiter,raydium-clmm').split(',').map((value) => value.trim()).filter(Boolean);
  const resolvedPrograms = [];

  for (const entry of requested) {
    if (DEX_PROGRAMS[entry]) {
      resolvedPrograms.push({ name: entry, programId: DEX_PROGRAMS[entry] });
      continue;
    }

    resolvedPrograms.push({ name: entry.slice(0, 12), programId: entry });
  }

  return resolvedPrograms;
}

export function loadConfig(env = process.env) {
  const apiKey = env.HELIUS_API_KEY || '';
  const baseEndpoint = env.LASERSTREAM_WS_ENDPOINT || env.HELIUS_WS_ENDPOINT || DEFAULT_ENDPOINT;
  const endpoint = baseEndpoint.includes('?api-key=') || !apiKey
    ? baseEndpoint
    : `${baseEndpoint}${apiKey}`;

  return {
    apiKey,
    endpoint,
    commitment: env.COMMITMENT || DEFAULT_COMMITMENT,
    metricsPort: Number.parseInt(env.METRICS_PORT || `${DEFAULT_METRICS_PORT}`, 10),
    programFilters: parseProgramSelection(env.DEX_PROGRAMS),
    includeAccounts: (env.ACCOUNT_INCLUDE || '').split(',').map((value) => value.trim()).filter(Boolean),
    excludeAccounts: (env.ACCOUNT_EXCLUDE || '').split(',').map((value) => value.trim()).filter(Boolean),
    requiredAccounts: (env.ACCOUNT_REQUIRED || '').split(',').map((value) => value.trim()).filter(Boolean),
  };
}
