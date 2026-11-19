# MintGuard — NFT Mint Verifier

**Built for #BuildHybridAI 2026** (Google / Firebase). Submission deadline: **1 December 2026, 05:00 WIB**.

MintGuard checks a BSC NFT contract **before you mint it**. Paste a contract address and MintGuard:

1. Reads the contract on-chain (bytecode, owner, supply, name/symbol) via BSC JSON-RPC.
2. Checks whether its source is verified on [Sourcify](https://sourcify.dev) and scans the verified source for owner-controlled functions (`setBaseURI`, `withdraw`, `mint`, `pause`, `transferOwnership`, …).
3. Scores the risk with a transparent deterministic rule engine.
4. Analyses the facts with **hybrid AI** — on-device **Gemini Nano** first (Chrome Desktop 139+), falling back to the cloud model when on-device is unavailable — via Firebase AI Logic (`firebase/ai`, `InferenceMode.PREFER_ON_DEVICE`, model `gemini-3.5-flash-lite`, structured JSON output).

No wallet connection. No transaction. No signing. Free to check.

## Agent ID integration (Agent ID Hackathon)

MintGuard uses Binance Agent ID as the minter's identity and reputation
layer. In the **Agent ID check** panel, enter an Agent ID handle (e.g.
`astrajingga0704`) and a wallet address: MintGuard calls the Agent ID
HandleRegistry on BSC (`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`,
`handleOf(address)`) and reports one of:

- **Verified** — the wallet owns that Agent ID on-chain.
- **Mismatch** — the wallet owns a different Agent ID than claimed.
- **No Agent ID** — the wallet has no Agent ID registered.

The check is read-only, runs alongside the contract verification when
both fields are filled, and never changes the deterministic risk verdict —
it is a separate reputation signal. Verified on-chain for the demo
identity: `handleOf(0x822854cfDb5A8a8e57e62F0F2214D8d974D4B562)` returns
`astrajingga0704`, and `ownerOf(keccak256("astrajingga0704"))` returns the
same wallet. See `src/agentid.js`.

## How hybrid inference works

- The app calls `model.initializeDeviceModel()` from the **Verify** click handler, then `generateContent()` with the verified on-chain facts and a strict JSON `responseSchema` (`verdict`, `riskScore`, `redFlags`, `summary`).
- `InferenceMode.PREFER_ON_DEVICE` makes the Firebase AI Logic SDK try Gemini Nano on-device first; any other browser automatically falls back to the cloud model.
- The UI reports the answering backend honestly: it only claims "on-device" when the SDK response metadata positively indicates it, otherwise it shows "Hybrid inference (Nano preferred)".
- AI Logic is called at runtime for every verification — not just imported. The deterministic checks run first and are always shown, even if AI is unavailable.

## Tech stack

- Vite + vanilla JS + custom CSS (no framework, no Tailwind)
- `firebase` ≥ 12.5.0 (`firebase/ai` — the current Firebase AI Logic SDK; **not** the legacy `firebase/vertexai`)
- BSC JSON-RPC (`bsc-dataseed1.bnbchain.org`, fallback `dataseed2`) + Sourcify API

## Setup

### 1. Create a free Firebase project (Spark plan — no billing)

1. Go to the [Firebase console](https://console.firebase.google.com) and create a project (Spark plan is free).
2. Add a **Web app** and copy its config values.
3. In the Firebase console, enable **App Check** and **AI Logic** (Gemini API): AI Logic → Get started → choose the **Gemini Developer API** (Google AI backend, free tier). No Blaze plan is needed.

### 2. Environment variables

Create a `.env` file in the project root (never commit it — it is gitignored):

```env
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-web-app-id
# Only needed for the hosted demo (App Check reCAPTCHA Enterprise):
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-enterprise-site-key
```

> The Firebase web `apiKey` is not a secret (it identifies the project), but it is still passed via env vars, never hard-coded.

### 3. App Check

- **Local development (`localhost`)**: the app sets `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before initializing App Check. Copy the debug token printed in the browser console and register it in Firebase console → App Check → Apps → Manage debug tokens. Debug tokens are for local development only.
- **Hosted demo**: App Check uses `ReCaptchaEnterpriseProvider` with `VITE_RECAPTCHA_SITE_KEY` (create the key in Google Cloud Console → reCAPTCHA Enterprise, then allowlist your demo domain).

### 4. Run

```bash
npm install
npm run dev      # local dev server, http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

Without Firebase env vars the app still boots and runs the full on-chain verification; the AI step is skipped with a clear notice until the config is set.

## Demo contracts

The UI ships three one-click demo contracts (real BSC contracts):

| Contract | Address | Expected result |
| --- | --- | --- |
| PIXIU Agents | `0x5777c2f59c65003ddebb018517b09f7ba0691202` | Source verified |
| Pokechain | `0x4EF929aF00cB93993c3D01834C4DA79200d31e32` | Source **not** verified |
| PXIO | `0x58e8f1b34B60687B36BCdc78e02a2fd443De71Ab` | Source verified |

## Submission notes

- Public GitHub repo (Apache-2.0, see `LICENSE`), live demo URL, and a ≤ 3-minute demo video on YouTube.
- The video shows the app verifying the three demo contracts above, including the on-device model preparation step in Chrome Desktop.
- Winners are announced on or around 21 December 2026; prizes are paid within 60 days of the completed winner forms.

## Limitations (MVP)

- BSC Chain 56 only for this MVP.
- On-device inference requires Chrome Desktop 139+ with the Prompt API enabled; every other browser uses the cloud model (same verdict schema).
- Sourcify source scanning is best-effort: if the source files cannot be fetched, the check reports "cannot scan" instead of guessing.
- MintGuard is a risk-screening aid, not financial advice.
