import { verifyContract, isValidAddress } from "./verifier.js";
import { verifyAgentId, normalizeHandle } from "./agentid.js";
import { onVerify, aiAvailable } from "./ai.js";
import { firebaseConfigured } from "./firebase.js";
import "./styles.css";

const $ = (id) => document.getElementById(id);
const addressInput = $("address");
const verifyBtn = $("verifyBtn");
const progressEl = $("progress");
const errorEl = $("error");
const resultsEl = $("results");

function setProgress(text) {
  progressEl.textContent = text || "";
  progressEl.classList.toggle("hidden", !text);
}

function setError(text) {
  errorEl.textContent = text || "";
  errorEl.classList.toggle("hidden", !text);
}

function renderAgentResult(result) {
  const el = $("agentResult");
  if (!el) return;
  const cls = result.verified ? "safe" : result.status === "mismatch" ? "dangerous" : "caution";
  const label = result.verified
    ? "Agent ID verified"
    : result.status === "mismatch"
      ? "Agent ID mismatch"
      : result.status === "no-agent-id"
        ? "No Agent ID"
        : "Agent ID check failed";
  el.innerHTML = `<span class="badge ${cls}">${esc(label)}</span> <span>${esc(result.detail)}</span>`;
  el.classList.remove("hidden");
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function runAgentCheck() {
  const handle = $("agentHandle").value.trim();
  const wallet = $("agentWallet").value.trim();
  const el = $("agentResult");
  if (!handle || !wallet) {
    if (el) {
      el.innerHTML = "Enter both an Agent ID handle and a wallet address to check.";
      el.classList.remove("hidden");
    }
    return null;
  }
  try {
    const result = await verifyAgentId(handle, wallet);
    renderAgentResult(result);
    return result;
  } catch (err) {
    if (el) {
      el.innerHTML = `<span class="badge caution">Agent ID check failed</span> <span>${esc(err.message || err)}</span>`;
      el.classList.remove("hidden");
    }
    return null;
  }
}

$("agentCheckBtn")?.addEventListener("click", runAgentCheck);

function verdictClass(v) {
  return v === "SAFE" ? "safe" : v === "DANGEROUS" ? "dangerous" : "caution";
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

function aiErrorText(err) {
  const msg = err?.message || "";
  // Combined on-device + cloud error: show it (it already has the short
  // cloud wording), just cap the length.
  if (msg.startsWith("On-device failed:")) {
    return msg.length > 240 ? `${msg.slice(0, 237)}…` : msg;
  }
  // The cloud 403 carries a long billing URL; show the human meaning.
  if (/free tier is not available/i.test(msg)) {
    return "Cloud AI unavailable (this project has no billing) — on-device Nano is the free path";
  }
  return msg.length > 160 ? `${msg.slice(0, 157)}…` : msg;
}

// Probe the raw Prompt API for a status line only — inference itself still
// goes through Firebase AI Logic (the hackathon requirement). This tells
// the user (and judges) whether Nano is ready, downloading, or unavailable.
async function probeNanoStatus() {
  const el = $("nanoStatus");
  if (!el) return;
  try {
    const LM = window.LanguageModel;
    if (!LM || typeof LM.availability !== "function") {
      el.textContent = "On-device AI (Gemini Nano): not supported in this browser (needs Chrome 139+).";
      return;
    }
    const raw = await LM.availability();
    // Prompt API values are "readily" | "after-download" | "no"
    // ("available"/"downloadable" kept as legacy tolerance only).
    const state = typeof raw === "string" ? raw : raw?.available ?? raw;
    if (state === "readily" || state === "available") {
      el.textContent = "On-device AI (Gemini Nano): ready on this browser.";
    } else if (state === "after-download" || state === "downloadable" || state === "downloading") {
      el.textContent =
        "On-device AI (Gemini Nano): model downloading in the background — run Verify, then try again in a few minutes.";
    } else {
      el.textContent = `On-device AI (Gemini Nano): unavailable in this browser (${String(state)}).`;
    }
  } catch (err) {
    el.textContent = "On-device AI (Gemini Nano): status unknown.";
    console.warn("[MintGuard] Nano status probe failed:", err);
  }
}

probeNanoStatus();

function renderResults({ facts, checks, riskScore, verdict, agentId }, ai, aiError, aiPending = false) {
  const finalVerdict = ai?.verdict || verdict;
  const finalScore = ai?.riskScore ?? riskScore;
  const flags = ai?.redFlags || [];

  resultsEl.innerHTML = `
    <div class="result-card card">
      <div class="verdict-row">
        <span class="badge ${verdictClass(finalVerdict)}">${esc(finalVerdict)}</span>
        <div class="score">
          <div class="score-label">Risk score: <strong>${esc(finalScore)} / 100</strong></div>
          <div class="score-bar">
            <div class="score-fill ${verdictClass(finalVerdict)}" style="width:${Math.min(100, Math.max(0, finalScore))}%"></div>
          </div>
        </div>
      </div>
      <p class="address-line"><code>${esc(facts.address)}</code> · BSC 56</p>
      ${
        agentId
          ? `<p class="address-line">Agent ID: <strong>${esc(agentId.verified ? "verified" : agentId.status)}</strong> — ${esc(agentId.registeredHandle ? `${agentId.registeredHandle}.ai` : "none")} for <code>${esc(agentId.walletAddress)}</code></p>`
          : ""
      }
      ${
        ai
          ? `<p class="ai-summary">${esc(ai.summary)}</p>
      ${
        flags.length
          ? `<h3>Red flags</h3><ul class="flags">${flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`
          : `<p class="no-flags">No red flags raised by the AI analysis.</p>`
      }
      <p class="backend">Analysed with ${esc(ai.backend)} · deterministic score ${esc(riskScore)}/100</p>`
          : aiPending
            ? `<p class="ai-skip">AI analysis running on-device (Gemini Nano) — first inference can take a minute or two…</p>`
            : `<p class="ai-skip">AI analysis unavailable (${
                esc(aiError ? aiErrorText(aiError) : firebaseConfigured ? "model error" : "Firebase not configured")
              }) — showing deterministic checks only. See README.md to enable AI.</p>`
      }
      <h3>On-chain checks</h3>
      <table class="checks">
        <tbody>
          ${checks
            .map(
              (c) => `<tr>
            <td><span class="status ${c.status}">${c.status.toUpperCase()}</span></td>
            <td><strong>${esc(c.label)}</strong><br><span class="detail">${esc(c.detail)}</span></td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
      <dl class="facts">
        <div><dt>Owner</dt><dd>${esc(facts.owner || "unknown")}${
          facts.owner ? (facts.ownerIsContract ? " (contract)" : " (EOA)") : ""
        }</dd></div>
        <div><dt>Total supply</dt><dd>${esc(facts.totalSupply ?? "unknown")}</dd></div>
        <div><dt>Name / Symbol</dt><dd>${esc(facts.name || "?")} / ${esc(facts.symbol || "?")}</dd></div>
        <div><dt>Source</dt><dd>${
          facts.verified
            ? `Verified on Sourcify (${esc(facts.sourcifyStatus)})`
            : "Not verified"
        }</dd></div>
      </dl>
    </div>`;
  resultsEl.classList.remove("hidden");
  resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function runVerify() {
  const address = addressInput.value.trim();
  setError("");
  resultsEl.classList.add("hidden");
  resultsEl.innerHTML = "";

  if (!isValidAddress(address)) {
    setError("Please enter a valid BSC contract address (0x followed by 40 hex characters).");
    return;
  }

  verifyBtn.disabled = true;
  try {
    setProgress("Fetching on-chain data…");
    const result = await verifyContract(address, setProgress);

    // Deterministic results render FIRST — an Agent ID hang/failure must
    // never block them (spec: deterministic checks are always shown).
    // The Agent ID check runs after, then re-renders with its result.
    setProgress("");
    renderResults(result, null, null, aiAvailable());

    // Agent ID identity check runs when the minter's handle + wallet are
    // filled in. It never changes the deterministic verdict — it is a
    // separate reputation signal.
    let agentId = null;
    if ($("agentHandle").value.trim() && $("agentWallet").value.trim()) {
      try {
        agentId = await verifyAgentId($("agentHandle").value.trim(), $("agentWallet").value.trim());
        renderAgentResult(agentId);
        result.agentId = agentId;
        renderResults(result, null, null, aiAvailable());
      } catch (err) {
        // Invalid handle/address throws: show it in the panel, not just
        // in the console — the user otherwise gets no feedback at all.
        console.warn("[MintGuard] Agent ID check failed:", err);
        agentId = {
          verified: false,
          status: "error",
          detail: `Agent ID check failed: ${err.message || err}`,
          registeredHandle: "",
          walletAddress: $("agentWallet").value.trim(),
        };
        renderAgentResult(agentId);
        result.agentId = agentId;
        renderResults(result, null, null, aiAvailable());
      }
    }

    let ai = null;
    let aiError = null;
    if (aiAvailable()) {
      try {
        // Bound the whole AI step: device init (20s) + hybrid attempt (120s)
        // + cloud-only retry (60s) = ~200s worst case, plus overhead.
        // Nano's first inference is slow; the cloud call alone takes ~35s.
        // Deterministic results are already on screen, so a long AI step
        // only delays the AI panel, never the verdict.
        ai = await Promise.race([
          onVerify(result.facts, result.checks, result.riskScore, setProgress),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("AI analysis timed out after 240s")), 240000),
          ),
        ]);
      } catch (err) {
        aiError = err;
        console.warn("[MintGuard] AI analysis failed:", err);
      }
    }

    setProgress("");
    renderResults(result, ai, aiError);
  } catch (err) {
    console.error(err);
    setProgress("");
    setError(
      `Verification failed: ${err.message || err}. Check the address and your connection, then try again.`,
    );
  } finally {
    verifyBtn.disabled = false;
  }
}

verifyBtn.addEventListener("click", runVerify);
addressInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runVerify();
});
document.querySelectorAll(".demo-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    addressInput.value = btn.dataset.address;
    runVerify();
  });
});
