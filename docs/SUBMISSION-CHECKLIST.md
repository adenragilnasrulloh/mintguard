# Submission Checklist — MintGuard (BuildHybridAI 2026)

Deadline: **1 Dec 2026, 05:00 WIB** (30 Nov 2026, 2:00 PM PT). Drafts can be saved on Devpost before submitting.

## Status

**SUBMITTED 21 Nov 2026 ~19:34 WIB** — https://devpost.com/software/mintguard-nft-mint-verifier
(submission ID 1314359, account takt9748, solo). All 5/5 steps done,
"Project submitted!" banner shown, answers re-read and verified after
submit. The project can still be edited until the deadline.

## Accounts (Eaglee — free, no card)

- [x] Devpost account (free) — registered for #BuildHybridAI 2026 on 21 Nov 2026 ("Thanks for registering!").
- [x] Firebase project (Spark plan, free) — mintguard-96088.
- [x] GitHub account/repo (public) — repo must be public with an open-source license.

## Firebase setup

- [x] Create Firebase project (Spark plan).
- [x] Enable AI Logic (Gemini Developer API) in Firebase console.
- [x] Copy web app config into `.env` (VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID).
- [x] App Check: localhost uses debug token; hosted demo uses reCAPTCHA Enterprise site key (VITE_RECAPTCHA_SITE_KEY).
- [x] Test the AI layer end-to-end (click Verify → on-device model → verdict) after config is in.

## Repo

- [x] Push to public GitHub repo (Apache-2.0 LICENSE included) — https://github.com/adenragilnasrulloh/mintguard, main = fa5ee4f (pushed 20 Nov ~01:35 WIB via Git Data API; HTTPS git push can't use the authd surrogate, see /tmp/reproduce_mintguard_head.py).
- [x] Confirm the license shows in the repo About section — Apache-2.0 detected.
- [x] Confirm NO secrets in the repo (no API keys, no service-account JSON, no debug tokens, no PII) — verified 20 Nov: `.env` 404, Agent ID survey draft (contains personal email) excluded + gitignored; demo video kept out of git.
- [x] Confirm Firebase AI Logic is actually called at runtime (src/ai.js → generateContent), not just imported — verified in browser 19 Nov 04:54 WIB (on-device Nano verdict CAUTION 39).
- [x] Repo homepage set to the hosted demo (https://mintguard-96088.web.app).

## Demo + video

- [x] Deploy hosted demo (Firebase Hosting, free tier) — judges must be able to open it.
- [x] Record demo video (< 3 min, public on YouTube, English) — see docs/DEMO-VIDEO-PLAN.md. First upload 19 Nov ~18:54 WIB (https://youtu.be/vz-EicbqLBo) was deleted/unavailable by 21 Nov ~19:20 WIB; RE-UPLOADED 21 Nov ~19:33 WIB to channel 'Eaglee': https://youtu.be/FZIFAjcFazo (2:00, Public, verified playing). File lokal: demo-video.mp4 (tidak masuk git).
- [ ] Take 2–3 screenshots for the Devpost page (optional — can still be added by editing the submission before the deadline).

## Devpost submission fields

- [x] Title: MintGuard — NFT Mint Verifier
- [x] Tagline (short, one line).
- [x] Description: what it does, how Firebase AI Logic is used (hybrid on-device Nano + cloud fallback), features, value proposition.
- [x] Category: Best Web/Chrome (via Web (Chrome) platform selection).
- [x] Repo URL (GitHub public).
- [x] Video URL (YouTube public) — https://youtu.be/FZIFAjcFazo.
- [x] Hosted demo URL.
- [x] "What I built during the submission period" summary (project is new, built 17–30 Nov 2026).

## Before hitting submit

- [x] Eaglee reviews the app, repo, video, and submission text.
- [x] Submit only after her explicit approval — approved 21 Nov, submitted 21 Nov ~19:34 WIB.
