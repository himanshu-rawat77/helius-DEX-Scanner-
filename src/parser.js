const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function toBase58(bytes) {
  if (!bytes || !bytes.length) {
    return '';
  }

  const digits = [0];

  for (const byte of bytes) {
    let carry = byte;

    for (let index = 0; index < digits.length; index += 1) {
      const value = (digits[index] << 8) + carry;
      digits[index] = value % 58;
      carry = Math.floor(value / 58);
    }

    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) {
    leadingZeros += 1;
  }

  let encoded = '1'.repeat(leadingZeros);
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    encoded += BASE58_ALPHABET[digits[index]];
  }

  return encoded;
}

function normalizeKey(entry) {
  if (!entry) {
    return '';
  }

  if (typeof entry === 'string') {
    return entry;
  }

  if (entry.pubkey) {
    return entry.pubkey;
  }

  if (entry instanceof Uint8Array || Array.isArray(entry)) {
    return toBase58(Array.from(entry));
  }

  if (entry.type === 'Buffer' && Array.isArray(entry.data)) {
    return toBase58(entry.data);
  }

  return '';
}

function readUiAmount(balance) {
  const amount = balance?.uiTokenAmount?.uiAmount;
  return typeof amount === 'number' ? amount : Number.parseFloat(balance?.uiTokenAmount?.uiAmountString || '0');
}

function indexBalancesByMintOwner(balances = []) {
  return new Map(
    balances
      .filter((balance) => balance?.mint)
      .map((balance) => [`${balance.mint}:${balance.owner || balance.accountIndex}`, balance])
  );
}

function detectDex(programIds, accountKeys = []) {
  const keySet = new Set(accountKeys.map(normalizeKey).filter(Boolean));
  return programIds.find((program) => keySet.has(program.programId)) || null;
}

function buildMintDeltas(preBalances = [], postBalances = []) {
  const preIndex = indexBalancesByMintOwner(preBalances);
  const postIndex = indexBalancesByMintOwner(postBalances);
  const keys = new Set([...preIndex.keys(), ...postIndex.keys()]);
  const deltas = [];

  for (const key of keys) {
    const pre = preIndex.get(key);
    const post = postIndex.get(key);
    const mint = post?.mint || pre?.mint;
    const owner = post?.owner || pre?.owner || 'unknown';
    const delta = readUiAmount(post) - readUiAmount(pre);

    if (!mint || delta === 0) {
      continue;
    }

    deltas.push({ mint, owner, delta });
  }

  return deltas;
}

function pickTransactionEnvelope(message) {
  if (message?.transaction?.transaction) {
    return {
      slot: message.transaction.slot || 0,
      transactionInfo: message.transaction.transaction,
      transaction: message.transaction.transaction.transaction,
      meta: message.transaction.transaction.meta,
      createdAt: message.createdAt || message.created_at,
    };
  }

  const result = message?.params?.result;
  const txValue = result?.value;
  const tx = txValue?.transaction;

  return {
    slot: result?.context?.slot ?? txValue?.slot ?? 0,
    transactionInfo: tx,
    transaction: tx?.transaction,
    meta: tx?.meta || txValue?.meta,
    createdAt: message?.createdAt || message?.created_at,
  };
}

export function extractSwapObservation(message, programIds) {
  const envelope = pickTransactionEnvelope(message);
  const transaction = envelope.transaction;
  const meta = envelope.meta;
  const accountKeys = transaction?.message?.accountKeys || [];
  const dex = detectDex(programIds, accountKeys);

  if (!dex || meta?.err) {
    return null;
  }

  const deltas = buildMintDeltas(meta.preTokenBalances, meta.postTokenBalances);
  const sold = deltas.filter((entry) => entry.delta < 0).sort((left, right) => left.delta - right.delta);
  const bought = deltas.filter((entry) => entry.delta > 0).sort((left, right) => right.delta - left.delta);

  if (!sold.length || !bought.length) {
    return null;
  }

  const base = sold[0];
  const quote = bought[0];
  const signatureBytes = envelope.transactionInfo?.signature || transaction?.signatures?.[0] || [];
  const signature = typeof signatureBytes === 'string' ? signatureBytes : normalizeKey(signatureBytes);
  const price = Math.abs(base.delta) > 0 ? Math.abs(quote.delta / base.delta) : 0;

  return {
    dex: dex.name,
    programId: dex.programId,
    signature: signature || 'unknown-signature',
    slot: envelope.slot,
    pair: `${base.mint}/${quote.mint}`,
    baseMint: base.mint,
    quoteMint: quote.mint,
    baseVolume: Math.abs(base.delta),
    quoteVolume: Math.abs(quote.delta),
    price,
    observedAt: envelope.createdAt || new Date().toISOString(),
  };
}
