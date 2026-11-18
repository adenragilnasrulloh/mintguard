// Hybrid AI analysis via Firebase AI Logic.
// Must be called from a user click handler: the on-device model is initialized
// from the gesture, before generateContent. On-device is preferred; when it is
// unavailable (non-Chrome browser, model not downloadable) the SDK falls back
// to the cloud model automatically.
import { verifierModel, cloudOnlyModel, firebaseConfigured } from "./firebase.js";

export const aiAvailable = () => firebaseConfigured && Boolean(verifierModel);

function buildPrompt(facts, checks, riskScore) {
  const lines = [
    "You are MintGuard, an NFT mint safety analyst. Analyse these on-chain facts about a BSC NFT contract and return a JSON verdict.",
    "",
    `Contract: ${facts.address} (BSC chain 56)`,
    `Bytecode present: ${facts.hasCode ? `yes (${facts.bytecodeLength} bytes)` : "NO — address is an EOA, not a contract"}`,
    `Source verified (Sourcify): ${facts.verified ? `yes (${facts.sourcifyStatus})` : "NO"}`,
    `Owner: ${facts.owner || "unknown"}${facts.owner ? (facts.ownerIsContract ? " (contract)" : " (EOA)") : ""}`,
    `totalSupply: ${facts.totalSupply ?? "unknown"}`,
    `Name/symbol: ${facts.name || "?"} (${facts.symbol || "?"})`,
    `Owner-controlled functions found in source: ${
      facts.dangerousFunctions.length
        ? facts.dangerousFunctions.join(", ")
        : "none / not scannable"
    }`,
    `Deterministic risk score: ${riskScore}/100`,
    "Checks:",
    ...checks.map((c) => `- [${c.status}] ${c.label}: ${c.detail}`),
    "",
    "Rules: SAFE means the contract looks standard and low-risk. CAUTION means there are material unknowns or owner powers. DANGEROUS means unverified source, no code, or owner powers that can rug users. Be specific in redFlags; summary max 3 sentences, plain English.",
  ];
  return lines.join("\n");
}

function detectBackend(result) {
  // The SDK does not expose the answering backend directly. Only claim
  // on-device when the response metadata positively says so; otherwise be
  // honest that hybrid inference was used with Nano preferred.
  try {
    const version = result?.response?.modelVersion || "";
    if (/nano/i.test(version)) return "on-device (Gemini Nano)";
  } catch {
    // fall through to the honest default
  }
  return "Hybrid inference (Nano preferred)";
}

/**
 * Analyse verified on-chain facts with the hybrid model.
 * @param {object} facts - from verifyContract()
 * @param {Array} checks - deterministic checks
 * @param {number} riskScore - deterministic score 0-100
 * @param {(msg: string) => void} [onProgress]
 * @returns {Promise<{ verdict, riskScore, redFlags, summary, backend }>}
 */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms),
    ),
  ]);
}

function extractJson(text) {
  // Gemini Nano often wraps JSON in ```json fences or adds prose around
  // it; the cloud model returns clean JSON. Strip fences, then take the
  // first {...} block.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("AI returned no JSON object");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function parseResult(result, riskScore, backend) {
  const parsed = extractJson(result.response.text());
  return {
    verdict: parsed.verdict,
    riskScore: typeof parsed.riskScore === "number" ? parsed.riskScore : riskScore,
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
    summary: parsed.summary || "",
    backend,
  };
}

export async function onVerify(facts, checks, riskScore, onProgress) {
  if (!aiAvailable()) {
    throw new Error(
      "Firebase AI is not configured — set VITE_FIREBASE_* env vars (see README.md).",
    );
  }

  onProgress?.("Preparing on-device model…");
  if (typeof verifierModel.initializeDeviceModel === "function") {
    // A stuck on-device download must never block the cloud fallback:
    // give Nano 20s, then let generateContent fall back to the cloud model.
    try {
      await withTimeout(
        verifierModel.initializeDeviceModel((progress) => {
          const pct =
            progress && typeof progress.progress === "number"
              ? ` (${Math.round(progress.progress * 100)}%)`
              : "";
          onProgress?.(`Preparing on-device model${pct}…`);
        }),
        20000,
        "On-device model init",
      );
    } catch (err) {
      console.warn("[MintGuard] On-device model unavailable, using cloud:", err);
    }
  }

  const prompt = buildPrompt(facts, checks, riskScore);

  // Attempt 1: hybrid (Nano preferred). The SDK never falls back to the
  // cloud when the on-device call itself is slow — it only falls back when
  // the device model is unavailable — so bound it at 45s and retry below.
  let hybridError = null;
  try {
    onProgress?.("Analyzing with hybrid AI…");
    const result = await withTimeout(
      verifierModel.generateContent(prompt),
      45000,
      "Hybrid AI analysis",
    );
    return parseResult(result, riskScore, detectBackend(result));
  } catch (err) {
    hybridError = err;
    console.warn("[MintGuard] Hybrid AI failed/slow, retrying in the cloud:", err);
  }

  // Attempt 2: cloud-only. The same model answered in ~35s via the REST
  // path, so give it 60s. If the cloud fails too, report BOTH errors so
  // the on-device reason is not hidden behind the cloud 403.
  onProgress?.("On-device is slow — retrying in the cloud…");
  try {
    const result = await withTimeout(
      cloudOnlyModel.generateContent(prompt),
      60000,
      "Cloud AI analysis",
    );
    return parseResult(result, riskScore, "cloud (Gemini 3.5 Flash-Lite)");
  } catch (cloudErr) {
    const cloudMsg = /free tier is not available/i.test(cloudErr?.message || "")
      ? "cloud unavailable (this project has no billing)"
      : cloudErr?.message || "cloud error";
    throw new Error(
      `On-device failed: ${hybridError?.message || "unknown on-device error"}. Cloud: ${cloudMsg}.`,
    );
  }
}
