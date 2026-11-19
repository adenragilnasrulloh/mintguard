// Agent ID identity check for MintGuard (Agent ID Hackathon).
//
// Verifies, read-only on BSC, that a wallet owns a given Agent ID handle.
// Registry: 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F (SPACE ID / Binance
// Agent ID HandleRegistry). The registry itself is the source of truth:
//   handleOf(address) -> handle string, e.g. handleOf(Eaglee's wallet)
//   returns "astrajingga0704".
// Using the registry's own reverse lookup avoids computing keccak256 in
// the browser; ownerOf(keccak256(handle)) was cross-checked on-chain and
// returns the same wallet. No wallet connection, no transaction, no signing.

import { isValidAddress } from "./verifier.js";

export const AGENT_ID_REGISTRY = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F";
export const AGENT_ID_REGISTRY_BSCSCAN = `https://bscscan.com/address/${AGENT_ID_REGISTRY}`;

const RPC_URLS = [
  "https://bsc-dataseed1.bnbchain.org",
  "https://bsc-dataseed2.bnbchain.org",
];

// handleOf(address) — first 4 bytes of keccak256("handleOf(address)").
const HANDLE_OF_SELECTOR = "0xc50a1514";

export function normalizeHandle(handle) {
  let h = String(handle || "").trim().toLowerCase();
  if (h.endsWith(".ai")) h = h.slice(0, -3);
  return h;
}

export function isValidHandle(handle) {
  return /^[a-z0-9][a-z0-9_-]{2,63}$/.test(normalizeHandle(handle));
}

async function rpcCall(method, params) {
  let lastError = null;
  for (const url of RPC_URLS) {
    try {
      // Bounded per endpoint: a hanging RPC must never block the
      // deterministic results (spec: they are always shown, even if
      // the Agent ID check fails). 15s per endpoint, ~30s worst case.
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(15000),
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

function decodeString(hex) {
  if (!hex || hex === "0x" || hex.length < 130) return "";
  try {
    const len = Number(BigInt(`0x${hex.slice(66, 130)}`));
    const dataHex = hex.slice(130, 130 + len * 2);
    const bytes = new Uint8Array(dataHex.match(/../g).map((b) => parseInt(b, 16)));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

/**
 * Verify that `walletAddress` owns Agent ID `handle`.
 * @returns {Promise<{ handle, walletAddress, registeredHandle, verified, status, detail }>}
 * status: "verified" | "mismatch" | "no-agent-id" | "error"
 */
export async function verifyAgentId(handle, walletAddress) {
  const cleanHandle = normalizeHandle(handle);
  const wallet = String(walletAddress || "").trim();
  if (!isValidHandle(cleanHandle)) {
    throw new Error("Invalid Agent ID handle (e.g. astrajingga0704).");
  }
  if (!isValidAddress(wallet)) {
    throw new Error("Invalid wallet address (0x followed by 40 hex characters).");
  }

  const data =
    HANDLE_OF_SELECTOR + "000000000000000000000000" + wallet.slice(2).toLowerCase();
  let raw;
  try {
    raw = await rpcCall("eth_call", [{ to: AGENT_ID_REGISTRY, data }, "latest"]);
  } catch (err) {
    return {
      handle: cleanHandle,
      walletAddress: wallet,
      registeredHandle: "",
      verified: false,
      status: "error",
      detail: `Agent ID registry could not be reached: ${err.message || err}`,
    };
  }

  const registeredHandle = decodeString(raw);
  if (!registeredHandle) {
    return {
      handle: cleanHandle,
      walletAddress: wallet,
      registeredHandle: "",
      verified: false,
      status: "no-agent-id",
      detail: `Wallet ${wallet} has no Agent ID registered on-chain.`,
    };
  }
  if (registeredHandle.toLowerCase() === cleanHandle) {
    return {
      handle: cleanHandle,
      walletAddress: wallet,
      registeredHandle,
      verified: true,
      status: "verified",
      detail: `Verified on-chain: wallet ${wallet} owns Agent ID ${registeredHandle}.ai (registry ${AGENT_ID_REGISTRY}).`,
    };
  }
  return {
    handle: cleanHandle,
    walletAddress: wallet,
    registeredHandle,
    verified: false,
    status: "mismatch",
    detail: `Wallet ${wallet} owns Agent ID ${registeredHandle}.ai, not ${cleanHandle}.ai — the claimed identity does not match the wallet.`,
  };
}
