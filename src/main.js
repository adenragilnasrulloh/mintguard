import { verifyContract, isValidAddress } from "./verifier.js";
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
      el.textContent = "On-device AI (Gemini Nano): not supported in this browser (needs Chrome 138+).";
      return;
    }
    const raw = await LM.availability();
    const state = typeof raw === "string" ? raw : raw?.available ?? raw;
    if (state === "available" || state === "readily") {
      el.textContent = "On-device AI (Gemini Nano): ready on this browser.";
    } else if (state === "downloading" || state === "downloadable" || state === "after-download") {
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

function renderResults({ facts, checks, riskScore, verdict }, ai, aiError) {
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
        ai
          ? `<p class="ai-summary">${esc(ai.summary)}</p>
      ${
        flags.length
          ? `<h3>Red flags</h3><ul class="flags">${flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`
          : `<p class="no-flags">No red flags raised by the AI analysis.</p>`
      }
      <p class="backend">Analysed with ${esc(ai.backend)} · deterministic score ${esc(riskScore)}/100</p>`
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

    // Deterministic results render FIRST — an AI hang must never block them.
    setProgress("");
    renderResults(result, null, null);

    let ai = null;
    let aiError = null;
    if (aiAvailable()) {
      try {
        // Bound the whole AI step: device init (20s) + hybrid attempt (45s)
        // + cloud-only retry (60s) = ~125s worst case, plus overhead.
        // The cloud call alone takes ~35s, so 150s leaves room without
        // hanging forever. Deterministic results are already on screen.
        ai = await Promise.race([
          onVerify(result.facts, result.checks, result.riskScore, setProgress),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("AI analysis timed out after 150s")), 150000),
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
