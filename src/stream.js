function normalizeCommitment(commitment, levels) {
  const normalized = String(commitment || '').toUpperCase();

  switch (normalized) {
    case 'PROCESSED':
      return levels.PROCESSED;
    case 'FINALIZED':
      return levels.FINALIZED;
    case 'CONFIRMED':
    default:
      return levels.CONFIRMED;
  }
}

export function buildSubscribeRequest(config, commitmentLevel) {
  const accountInclude = [...config.programFilters.map((program) => program.programId), ...config.includeAccounts];

  return {
    transactions: {
      'dex-monitor': {
        accountInclude,
        accountExclude: config.excludeAccounts,
        accountRequired: config.requiredAccounts,
        vote: false,
        failed: false,
      },
    },
    commitment: normalizeCommitment(config.commitment, commitmentLevel),
    accounts: {},
    slots: {},
    transactionsStatus: {},
    blocks: {},
    blocksMeta: {},
    entry: {},
    accountsDataSlice: [],
  };
}

export async function startLaserstreamSubscription(config, onMessage) {
  if (!config.apiKey) {
    throw new Error('HELIUS_API_KEY is required to connect to the LaserStream gRPC endpoint.');
  }

  const { subscribe, CommitmentLevel } = await import('helius-laserstream');
  const request = buildSubscribeRequest(config, CommitmentLevel);

  await subscribe(
    {
      apiKey: config.apiKey,
      endpoint: config.endpoint,
    },
    request,
    async (data) => {
      onMessage(data);
    },
    async (error) => {
      console.error('LaserStream stream error:', error);
    }
  );
}
