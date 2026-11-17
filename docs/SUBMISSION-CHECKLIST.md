# Submission Checklist — MintGuard (BuildHybridAI 2026)

Deadline: **1 Dec 2026, 05:00 WIB** (30 Nov 2026, 2:00 PM PT). Drafts can be saved on Devpost before submitting.

## Accounts (Eaglee — free, no card)

- [ ] Devpost account (free) — needed to register + submit.
- [ ] Firebase project (Spark plan, free) — needed for AI Logic + hosting.
- [ ] GitHub account/repo (public) — repo must be public with an open-source license.

## Firebase setup

- [ ] Create Firebase project (Spark plan).
- [ ] Enable AI Logic (Gemini Developer API) in Firebase console.
- [ ] Copy web app config into `.env` (VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID).
- [ ] App Check: localhost uses debug token; hosted demo uses reCAPTCHA Enterprise site key (VITE_RECAPTCHA_SITE_KEY).
- [ ] Test the AI layer end-to-end (click Verify → on-device model → verdict) after config is in.

## Repo

- [ ] Push to public GitHub repo (Apache-2.0 LICENSE included).
- [ ] Confirm the license shows in the repo About section.
- [ ] Confirm NO secrets in the repo (no API keys, no service-account JSON, no debug tokens, no PII).
- [ ] Confirm Firebase AI Logic is actually called at runtime (src/ai.js → generateContent), not just imported.

## Demo + video

- [ ] Deploy hosted demo (Firebase Hosting, free tier) — judges must be able to open it.
- [ ] Record demo video (< 3 min, public on YouTube, English) — see docs/DEMO-VIDEO-PLAN.md.
- [ ] Take 2–3 screenshots for the Devpost page.

## Devpost submission fields

- [ ] Title: MintGuard — NFT Mint Verifier
- [ ] Tagline (short, one line).
- [ ] Description: what it does, how Firebase AI Logic is used (hybrid on-device Nano + cloud fallback), features, value proposition.
- [ ] Category: Best Web/Chrome.
- [ ] Repo URL (GitHub public).
- [ ] Video URL (YouTube public).
- [ ] Hosted demo URL.
- [ ] "What I built during the submission period" summary (project is new, built 17–30 Nov 2026).

## Before hitting submit

- [ ] Eaglee reviews the app, repo, video, and submission text.
- [ ] Submit only after her explicit approval.
