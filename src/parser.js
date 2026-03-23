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
  const keySet = new Set(
    accountKeys.map((entry) => typeof entry === 'string' ? entry : entry?.pubkey).filter(Boolean)
  );

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

export function extractSwapObservation(message, programIds) {
  const result = message?.params?.result;
  const txValue = result?.value;
  const tx = txValue?.transaction;
  const meta = tx?.meta || txValue?.meta;
  const accountKeys = tx?.transaction?.message?.accountKeys || tx?.message?.accountKeys || [];
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
  const price = Math.abs(base.delta) > 0 ? Math.abs(quote.delta / base.delta) : 0;
  const signature = tx?.transaction?.signatures?.[0] || tx?.signatures?.[0] || 'unknown-signature';

  return {
    dex: dex.name,
    programId: dex.programId,
    signature,
    slot: result?.context?.slot ?? txValue?.slot ?? 0,
    pair: `${base.mint}/${quote.mint}`,
    baseMint: base.mint,
    quoteMint: quote.mint,
    baseVolume: Math.abs(base.delta),
    quoteVolume: Math.abs(quote.delta),
    price,
    observedAt: new Date().toISOString(),
  };
}
