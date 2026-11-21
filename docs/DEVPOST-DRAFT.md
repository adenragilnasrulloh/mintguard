# Devpost Submission — MintGuard (#BuildHybridAI 2026)

Status: **SUBMITTED 21 Nov 2026 ~19:34 WIB** — https://devpost.com/software/mintguard-nft-mint-verifier
(submission ID 1314359, account takt9748, solo). All 5/5 steps done,
"Project submitted!" banner shown, answers re-read and verified after
submit. The project can still be edited until the deadline
(1 Dec 2026, 05:00 WIB). New demo video (old one vz-EicbqLBo was
deleted): https://youtu.be/FZIFAjcFazo.

Form structure (read live 21 Nov 19:07–19:10 WIB): 5 steps — 1) Manage
team, 2) Project overview, 3) Project details, 4) Additional info,
5) Submit. No "Save draft" button; each step has "Save & continue".

## Step 1 — Manage team

Skip (solo). Teammate on file: Tak Tahu (@takt9748).

## Step 2 — Project overview

- **Project name** (required, max 60 chars):
  `MintGuard — NFT Mint Verifier`
- **Elevator pitch** (required, max 200 chars):
  `Check a BSC NFT contract before you mint it — on-chain facts plus hybrid AI, in seconds.`
- **Thumbnail**: optional — skip for now (no thumbnail prepared yet).

## Step 3 — Project details

- **About the project** (required, Markdown):

> **Inspiration:** Free mints on BNB Smart Chain are full of contracts
> you can't trust — unverified source, an owner who can mint more or drain
> funds, a supply that doesn't match the promise. Checking that by hand
> takes ten minutes and a block explorer, and most people just mint and
> hope. I mint free NFTs myself, and I wanted a check that takes seconds,
> before anyone mints.
>
> **What it does:** Paste a BSC contract address and MintGuard reads the
> contract on-chain (bytecode, owner, supply, name/symbol), checks whether
> its source is verified on Sourcify, and scores the risk with a
> transparent deterministic rule engine: SAFE, CAUTION, or DANGEROUS,
> 0–100, with every check shown. On top of that, hybrid AI analyses the
> verified facts and returns a second verdict with red flags and a
> plain-English summary. It also checks the minter's Binance Agent ID
> against the SPACE ID HandleRegistry as a separate reputation signal, and
> records verdicts in a public on-chain attestation registry
> (MintGuardRegistry, source verified on BscScan). No wallet connection,
> no transaction, no signing — free to check.
>
> **How I built it:** Vite + vanilla JavaScript, Firebase AI Logic
> (`firebase/ai`, `GoogleAIBackend`) with `InferenceMode.PREFER_ON_DEVICE`
> — `initializeDeviceModel()` runs from the Verify click handler, then
> `generateContent()` with the verified on-chain facts and a strict JSON
> `responseSchema`. Gemini Nano runs on-device first (Chrome 139+, private
> and free); when on-device is unavailable the app falls back to the cloud
> model (`gemini-3.5-flash-lite`) through a separate `ONLY_IN_CLOUD` model.
> App Check is enforced: reCAPTCHA Enterprise on the hosted demo, debug
> token on localhost. The UI reports the answering backend honestly. The
> deterministic checks always render first, even if AI is unavailable.
> Data comes from BSC JSON-RPC and the Sourcify API. Hosted on Firebase
> Hosting (Spark plan, no billing).
>
> **Challenges:** Mid-build, the project's Gemini API free-tier access
> stopped working (HTTP 403, no billing account) — so the cloud path
> became unusable and the whole AI layer had to work on-device with
> Gemini Nano. I also found and worked around a real SDK behavior: under
> `PREFER_ON_DEVICE` the SDK never falls back to cloud once the device
> model reports available, so timeouts and parsing had to be handled in
> the app itself. The on-device verdict now matches the deterministic
> score (PIXIU: CAUTION 39) in about 30–60 seconds.
>
> **What I learned:** Hybrid inference in practice — when on-device is
> enough, when to fall back, and how to make an AI verdict verifiable
> instead of a black box: every AI claim in MintGuard is grounded in
> facts the app already verified on-chain.

- **Built with** (required, up to 25 tags):
  Vite, JavaScript, Firebase AI Logic, Firebase Hosting, Firebase App
  Check, BSC JSON-RPC, Sourcify API, SPACE ID, Gemini Nano, HTML, CSS
- **"Try it out" links** (optional):
  https://mintguard-96088.web.app (demo) and
  https://github.com/adenragilnasrulloh/mintguard (repo)
- **Image gallery**: optional — skip for now (no screenshots prepared yet).
- **Demo video URL** (required): https://youtu.be/FZIFAjcFazo (re-uploaded 21 Nov; old vz-EicbqLBo deleted)

## Step 4 — Additional info (private review, not on public page)

- **Submitter type** (required): Individual
- **Submitter country of residence** (required): Indonesia
- **Organization name (if applicable)** (required despite the label):
  `N/A` (no organization — individual submission)
- **Is your project new or was it built on an existing project?**
  (required): `New. This project did not existing before Nov 11, 2026`
  (Devpost's own wording, typo included)
- **When did you start working on your project?** (required):
  `November 17, 2026. MintGuard is a new project built entirely during
  the submission period (November 17–30, 2026).`
- **Testing instructions or credentials the judges need to test your
  project, if any**: `No account, credentials, or wallet needed. Open
  https://mintguard-96088.web.app, click a demo contract (PIXIU,
  Pokechain, or PXIO), then click Verify. Deterministic checks work in
  any browser. For the on-device AI verdict, use Chrome 139+ (Gemini Nano
  runs on-device); the page shows the answering backend honestly.`
- **Explain how your project meets the main technology requirement**
  (required): `MintGuard is built on Firebase AI Logic (firebase/ai,
  GoogleAIBackend). Every verification calls getGenerativeModel with
  InferenceMode.PREFER_ON_DEVICE: initializeDeviceModel() runs from the
  Verify click handler and generateContent() sends the verified on-chain
  facts with a strict JSON responseSchema (verdict, riskScore, redFlags,
  summary). Gemini Nano answers on-device first (Chrome 139+); when
  on-device is unavailable the app falls back to the cloud model
  gemini-3.5-flash-lite via a separate ONLY_IN_CLOUD model. App Check is
  enforced (reCAPTCHA Enterprise on the hosted demo, debug token on
  localhost). AI Logic is called at runtime for every verification, not
  just imported — the deterministic checks render first and are always
  shown even if AI is unavailable.`
- **Which Platform(s) did you use to build your project?** (required):
  Web (Chrome)
- **Provide a URL to a working demo or video demo of your project.**
  (required): https://mintguard-96088.web.app
- **Provide a URL to your open-source license.** (required):
  https://github.com/adenragilnasrulloh/mintguard/blob/main/LICENSE
- **Checkboxes** (all required): age of majority; eligible jurisdiction;
  not an employee/representative/agent of the Promotion Entities — all to
  be checked (Eaglee's attestations).

## Step 5 — Submit

- **Terms checkbox** (required): "I, and all of my team members, have
  read and agree to be bound by the Official Rules and the Devpost Terms
  of Service." — to be checked.
- Click **Submit project**. (Editable afterwards until the deadline.)

## Links

- Public repo: https://github.com/adenragilnasrulloh/mintguard (Apache-2.0)
- Hosted demo: https://mintguard-96088.web.app
- Demo video (YouTube, public, 2:00): https://youtu.be/FZIFAjcFazo (re-uploaded 21 Nov; old vz-EicbqLBo deleted)
- Category: Best Web/Chrome (via the Web (Chrome) platform selection)
