export function buildTransactionSubscribeRequest(config) {
  const accountInclude = [...config.programFilters.map((program) => program.programId), ...config.includeAccounts];

  return {
    jsonrpc: '2.0',
    id: 1,
    method: 'transactionSubscribe',
    params: [
      {
        vote: false,
        failed: false,
        accountInclude,
        accountExclude: config.excludeAccounts,
        accountRequired: config.requiredAccounts,
      },
      {
        commitment: config.commitment,
        encoding: 'jsonParsed',
        transactionDetails: 'full',
        maxSupportedTransactionVersion: 1,
      },
    ],
  };
}

export function startLaserstreamBackedWebSocket(config, onMessage) {
  if (!config.apiKey && config.endpoint === 'wss://mainnet.helius-rpc.com/?api-key=') {
    throw new Error('HELIUS_API_KEY is required to connect to the Helius WebSocket endpoint.');
  }

  const socket = new WebSocket(config.endpoint);
  const ping = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'ping' }));
    }
  }, 60_000);

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify(buildTransactionSubscribeRequest(config)));
  });

  socket.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data);
    onMessage(payload);
  });

  socket.addEventListener('close', () => clearInterval(ping));
  socket.addEventListener('error', (error) => {
    console.error('WebSocket stream error:', error.message || error);
  });

  return socket;
}
