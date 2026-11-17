// Deterministic on-chain verification of a BSC NFT contract.
// No AI here — pure facts + rule engine. Runs in the browser and in Node
// (fetch only), so the same logic can be unit-tested without a browser.

const RPC_URLS = [
  "https://bsc-dataseed1.bnbchain.org",
  "https://bsc-dataseed2.bnbchain.org",
];

// Function selectors (first 4 bytes of keccak256 of the signature).
const SELECTORS = {
  owner: "0x8da5cb5b", // owner()
  totalSupply: "0x18160ddd", // totalSupply()
  name: "0x06fdde03", // name()
  symbol: "0x95d89b41", // symbol()
};

export const DANGEROUS_FUNCTIONS = [
  "setBaseURI",
  "setURI",
  "withdraw",
  "mint",
  "pause",
  "unpause",
  "transferOwnership",
  "renounceOwnership",
  "setRoyalty",
  "setMinter",
  "blacklist",
];

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";

export function isValidAddress(address) {
  return /^0x[0-9a-fA-F]{40}$/.test(address || "");
}

async function rpcCall(method, params) {
  let lastError = null;
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message || "RPC error");
      return json.result;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("All BSC RPC endpoints failed");
}

function decodeAddress(word) {
  if (!word || word === "0x" || word.length < 66) return null;
  return "0x" + word.slice(-40);
}

function decodeUint(word) {
  if (!word || word === "0x") return null;
  try {
    return BigInt(word);
  } catch {
    return null;
  }
}

function decodeString(hex) {
  if (!hex || hex === "0x" || hex.length < 130) return null;
  try {
    const len = Number(BigInt(`0x${hex.slice(66, 130)}`));
    const dataHex = hex.slice(130, 130 + len * 2);
    const bytes = new Uint8Array(dataHex.match(/../g).map((b) => parseInt(b, 16)));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

async function fetchSourcifyStatus(address) {
  // Sourcify API v2 (v1 was removed). 404 / match null = not verified.
  const url = `https://sourcify.dev/server/v2/contract/56/${address}`;
  const res = await fetch(url);
  if (res.status === 404) return "false";
  if (!res.ok) throw new Error(`Sourcify HTTP ${res.status}`);
  const json = await res.json();
  const match = json?.match || json?.runtimeMatch || null;
  if (!match) return "false";
  // Normalize v2 match values to the v1-style labels the UI expects.
  if (match === "exact_match" || match === "perfect") return "perfect";
  if (match === "partial_match" || match === "partial") return "partial";
  return match;
}

async function fetchSourcifySource(address) {
  // Best effort: fetch the verified source files as JSON and scan them.
  // v2 returns { sources: { "File.sol": { content: "..." }, ... } }.
  const url = `https://sourcify.dev/server/v2/contract/56/${address}?fields=sources`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const chunks = [];
  const sources = json?.sources || {};
  for (const file of Object.values(sources)) {
    if (typeof file?.content === "string") chunks.push(file.content);
    else if (typeof file === "string") chunks.push(file);
  }
  // Fallback: walk the whole payload defensively in case the shape changes.
  if (chunks.length === 0) {
    const walk = (value) => {
      if (typeof value === "string") chunks.push(value);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") Object.values(value).forEach(walk);
    };
    walk(json);
  }
  return chunks.join("\n");
}

function scanDangerousFunctions(source) {
  if (!source) return [];
  const found = [];
  for (const fn of DANGEROUS_FUNCTIONS) {
    if (new RegExp(`\\bfunction\\s+${fn}\\s*\\(`, "i").test(source)) found.push(fn);
  }
  return found;
}

/**
 * Verify a BSC contract address end to end.
 * @param {string} address - 0x + 40 hex chars
 * @param {(msg: string) => void} [onProgress]
 * @returns {Promise<{ facts: object, checks: Array, riskScore: number, verdict: "SAFE"|"CAUTION"|"DANGEROUS" }>}
 */
export async function verifyContract(address, onProgress) {
  if (!isValidAddress(address)) {
    throw new Error("Invalid BSC contract address (expected 0x followed by 40 hex characters).");
  }
  const checks = [];
  const facts = { address, chainId: 56 };

  onProgress?.("Fetching on-chain data…");

  const code = await rpcCall("eth_getCode", [address, "latest"]);
  facts.hasCode = Boolean(code && code !== "0x" && code.length > 2);
  facts.bytecodeLength = facts.hasCode ? (code.length - 2) / 2 : 0;

  const [ownerRaw, supplyRaw, nameRaw, symbolRaw] = await Promise.all([
    rpcCall("eth_call", [{ to: address, data: SELECTORS.owner }, "latest"]).catch(() => null),
    rpcCall("eth_call", [{ to: address, data: SELECTORS.totalSupply }, "latest"]).catch(() => null),
    rpcCall("eth_call", [{ to: address, data: SELECTORS.name }, "latest"]).catch(() => null),
    rpcCall("eth_call", [{ to: address, data: SELECTORS.symbol }, "latest"]).catch(() => null),
  ]);

  facts.owner = decodeAddress(ownerRaw);
  const supply = decodeUint(supplyRaw);
  facts.totalSupply = supply === null ? null : supply.toString();
  facts.name = decodeString(nameRaw);
  facts.symbol = decodeString(symbolRaw);

  if (facts.owner) {
    const ownerCode = await rpcCall("eth_getCode", [facts.owner, "latest"]).catch(() => "0x");
    facts.ownerIsContract = Boolean(ownerCode && ownerCode !== "0x" && ownerCode.length > 2);
  } else {
    facts.ownerIsContract = false;
  }

  // Sourcify verification status (and source scan when verified).
  let sourcifyStatus = "false";
  try {
    sourcifyStatus = await fetchSourcifyStatus(address);
  } catch (err) {
    facts.sourcifyError = String(err.message || err);
  }
  facts.verified = sourcifyStatus === "perfect" || sourcifyStatus === "partial";
  facts.sourcifyStatus = sourcifyStatus;

  let dangerousFunctions = [];
  if (facts.verified) {
    try {
      const source = await fetchSourcifySource(address);
      dangerousFunctions = scanDangerousFunctions(source);
    } catch {
      // Source scan is best-effort; verification status still stands.
    }
  }
  facts.dangerousFunctions = dangerousFunctions;

  // --- Deterministic checks + risk score (0–100) ---
  let score = 0;
  const add = (id, label, status, detail, points = 0) => {
    checks.push({ id, label, status, detail });
    score += points;
  };

  if (!facts.hasCode) {
    add(
      "code",
      "Contract bytecode present",
      "fail",
      "Address has no code — it is an EOA, not a contract.",
      100,
    );
  } else {
    add(
      "code",
      "Contract bytecode present",
      "pass",
      `${facts.bytecodeLength.toLocaleString()} bytes of bytecode on-chain.`,
    );
  }

  if (facts.verified) {
    add(
      "sourcify",
      "Source verified on Sourcify",
      "pass",
      `Match status: ${sourcifyStatus}. Source code is public and matches the deployed bytecode.`,
    );
  } else {
    add(
      "sourcify",
      "Source verified on Sourcify",
      "fail",
      "Source NOT verified — the contract logic cannot be audited. Treat as high risk.",
      50,
    );
  }

  if (!facts.owner) {
    add(
      "owner",
      "Owner readable",
      "warn",
      "No owner() function — ownership model unknown (may be ownerless or non-standard).",
      5,
    );
  } else if (
    facts.owner.toLowerCase() === ZERO_ADDRESS ||
    facts.owner.toLowerCase() === DEAD_ADDRESS
  ) {
    add(
      "owner",
      "Owner address",
      "pass",
      `Owner is ${facts.owner} — ownership effectively renounced.`,
    );
  } else if (facts.ownerIsContract) {
    add(
      "owner",
      "Owner address",
      "warn",
      `Owner is a contract (${facts.owner}) — could be a multisig or another contract; verify what controls it.`,
      10,
    );
  } else {
    add(
      "owner",
      "Owner address",
      "warn",
      `Owner is an EOA (${facts.owner}) — a single key can exercise owner powers.`,
      15,
    );
  }

  if (dangerousFunctions.length > 0) {
    add(
      "owner-fns",
      "Owner-controlled functions",
      "warn",
      `Found in verified source: ${dangerousFunctions.join(", ")}.`,
      Math.min(dangerousFunctions.length * 8, 24),
    );
  } else if (facts.verified) {
    add(
      "owner-fns",
      "Owner-controlled functions",
      "pass",
      "None of the commonly abused owner functions were found in the verified source.",
    );
  } else {
    add(
      "owner-fns",
      "Owner-controlled functions",
      "warn",
      "Cannot scan — source is not verified.",
      0,
    );
  }

  if (facts.totalSupply === null) {
    add("supply", "totalSupply() readable", "warn", "totalSupply() not readable — non-standard token.", 5);
  } else if (facts.totalSupply === "0") {
    add(
      "supply",
      "totalSupply()",
      "warn",
      "totalSupply is 0 — nothing minted yet or supply fully burned.",
      5,
    );
  } else {
    add(
      "supply",
      "totalSupply()",
      "pass",
      `${BigInt(facts.totalSupply).toLocaleString()} tokens minted.`,
    );
  }

  if (facts.name && facts.symbol) {
    add("metadata", "name() / symbol()", "pass", `${facts.name} (${facts.symbol}).`);
  } else {
    add(
      "metadata",
      "name() / symbol()",
      "warn",
      "name() or symbol() not readable — non-standard metadata.",
      5,
    );
  }

  score = Math.max(0, Math.min(100, score));
  const verdict = score >= 70 ? "DANGEROUS" : score >= 35 ? "CAUTION" : "SAFE";

  return { facts, checks, riskScore: score, verdict };
}
