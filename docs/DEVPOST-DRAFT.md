# Devpost Submission Draft — MintGuard (#BuildHybridAI 2026)

Status: **DRAFT — NOT SUBMITTED.** Eaglee reviews this first; submit only
after her explicit approval. Deadline: **1 Dec 2026, 05:00 WIB**
(30 Nov 2026, 2:00 PM PT).

## Links

- Public repo: https://github.com/adenragilnasrulloh/mintguard (Apache-2.0)
- Hosted demo: https://mintguard-96088.web.app
- Demo video (YouTube, public, 2:01): https://youtu.be/vz-EicbqLBo
- Category: **Best Web/Chrome**

## Title

MintGuard — NFT Mint Verifier

## Tagline

Check a BSC NFT contract before you mint it — on-chain facts plus hybrid
AI, in seconds.

## Description (paste into Devpost)

Free mints on BNB Smart Chain are full of contracts you cannot trust:
unverified source, an owner who can mint more or drain funds, a supply
that does not match the promise. Checking that by hand takes ten minutes
and a block explorer — most people just mint and hope.

MintGuard turns that check into seconds. Paste a BSC contract address and
MintGuard reads the contract on-chain (bytecode, owner, supply,
name/symbol), checks whether its source is verified on Sourcify, and scores
the risk with a transparent deterministic rule engine: SAFE, CAUTION, or
DANGEROUS, 0–100, with every check shown. No wallet connection, no
transaction, no signing — it is free to check.

On top of the deterministic checks, MintGuard analyses the verified facts
with hybrid AI and returns a second verdict with red flags and a plain-
English summary. It also checks the minter's Binance Agent ID against the
SPACE ID HandleRegistry on BSC as a separate reputation signal, and records
its verdicts in a public on-chain attestation registry
([MintGuardRegistry](https://bscscan.com/address/0x8b224e13cc20df552766dd41a2531b46f09a9457),
source verified on BscScan).

### How Firebase AI Logic is used

MintGuard uses Firebase AI Logic (`firebase/ai`, `GoogleAIBackend`) for
hybrid inference. The app creates its model with
`InferenceMode.PREFER_ON_DEVICE`, calls `initializeDeviceModel()` from the
Verify click handler, then calls `generateContent()` with the verified
on-chain facts and a strict JSON `responseSchema` (`verdict`, `riskScore`,
`redFlags`, `summary`).

Gemini Nano runs on-device first (Chrome 139+, private and free); when
on-device is unavailable the app falls back to the cloud model
(`gemini-3.5-flash-lite`) through a separate `ONLY_IN_CLOUD` model. App
Check is enforced: reCAPTCHA Enterprise on the hosted demo, a debug token
on localhost. The UI reports the answering backend honestly — it only
claims "on-device" when the response metadata positively says so.

AI Logic is called at runtime for every verification, not just imported.
The deterministic checks render first and are always shown, even if AI is
unavailable.

### Try it

1. Open https://mintguard-96088.web.app
2. Click a demo contract: **PIXIU** (verified), **Pokechain**
   (unverified), or **PXIO** (verified).
3. Chrome 139+ runs the AI verdict on-device with Gemini Nano; any
   browser gets the deterministic checks.

## Built With

Vite, vanilla JavaScript, Firebase AI Logic, Firebase Hosting, Firebase
App Check, BSC JSON-RPC, Sourcify API, SPACE ID Agent ID registry.

## What I built during the submission period

MintGuard is a new project, built 17–30 November 2026 for this hackathon.
Everything in the repo — the verifier, the hybrid AI layer, the Agent ID
check, the attestation contract, the docs — was written during the
submission period. No pre-existing code.

## Before submitting (Eaglee)

- [ ] Read this draft and the repo README; fix anything that is wrong.
- [ ] Watch the video once: https://youtu.be/vz-EicbqLBo
- [ ] Open the demo and run one Verify yourself.
- [ ] Confirm the Devpost account to submit from (currently logged in as
      takt9748 on Devpost).
- [ ] Say the word — then submit.
