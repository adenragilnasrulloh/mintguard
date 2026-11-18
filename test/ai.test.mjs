// test/ai.test.mjs — Node smoke test for the Firebase AI Logic cloud path.
// Uses the same model + responseSchema as src/firebase.js. On-device Nano is
// skipped in Node (no LanguageModel API); generateContent falls back to cloud,
// exactly like the app does in a browser without Nano.
import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  console.error("Firebase config missing — set VITE_FIREBASE_* env vars.");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
  // Hybrid mode ignores top-level `model`/`generationConfig` — see src/firebase.js.
  inCloudParams: {
    model: "gemini-3.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          verdict: { type: "string", enum: ["SAFE", "CAUTION", "DANGEROUS"] },
          riskScore: { type: "number" },
          redFlags: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        },
        required: ["verdict", "riskScore", "redFlags", "summary"],
      },
    },
  },
});

const prompt = `You are MintGuard, an NFT mint safety analyst. Analyse these on-chain facts about a BSC NFT contract and return a JSON verdict.

Contract: 0x5777c2f59c65003ddebb018517b09f7ba0691202 (BSC chain 56)
Bytecode present: yes (17033 bytes)
Source verified (Sourcify): yes (perfect)
Owner: 0x23f5...fbaa (EOA)
totalSupply: 575
Name/symbol: PIXIU Agents (PIXIU)
Owner-controlled functions found in source: withdraw, mint, transferOwnership
Deterministic risk score: 39/100
Checks:
- [pass] Contract bytecode present
- [pass] Source verified on Sourcify
- [warn] Owner is an EOA
- [warn] Owner-controlled functions: withdraw, mint, transferOwnership

Rules: SAFE means the contract looks standard and low-risk. CAUTION means there are material unknowns or owner powers. DANGEROUS means unverified source, no code, or owner powers that can rug users. Be specific in redFlags; summary max 3 sentences, plain English.`;

const started = Date.now();
const result = await model.generateContent(prompt);
const parsed = JSON.parse(result.response.text());
console.log(`AI verdict (${((Date.now() - started) / 1000).toFixed(1)}s):`);
console.log(JSON.stringify(parsed, null, 2));
