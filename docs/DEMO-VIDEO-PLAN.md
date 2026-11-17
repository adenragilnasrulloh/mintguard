# Demo Video Plan — MintGuard (BuildHybridAI 2026)

Target: under 3 minutes, public on YouTube, English narration (or English subtitles).
Record in Chrome Desktop 139+ with the Prompt API flag enabled so the on-device
Gemini Nano path is real on screen (`chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`).
Record at 1080p, capture the app window only, no faces needed.

## Shot list

| Time | Shot | Narration (draft) |
|---|---|---|
| 0:00–0:15 | Hook: paste Pokechain address, hit Verify, DANGEROUS 70 appears | "Every free mint could be a trap. This one looked fine — until MintGuard checked it." |
| 0:15–0:45 | What it is: the three checks animate in (Sourcify, owner, supply) | "MintGuard verifies an NFT contract before you mint: is the source public, who owns it, and what can the owner do?" |
| 0:45–1:30 | Hybrid inference: "Preparing on-device model" progress, then verdict JSON | "The analysis runs on-device with Gemini Nano first, so it's instant and private. If Nano isn't available, it falls back to the cloud — same verdict, same format." |
| 1:30–2:15 | Three demo contracts side by side: PIXIU CAUTION 39, Pokechain DANGEROUS 70, PXIO CAUTION 39 | "Verified doesn't always mean safe. PIXIU and PXIO are verified, but a single key still holds owner powers — so they get Caution, honestly." |
| 2:15–2:50 | How it works: Firebase AI Logic + App Check + free tier; repo on screen | "Built with Firebase AI Logic, hybrid on-device and cloud inference, protected by App Check — all on the free tier." |
| 2:50–3:00 | Closing: demo URL + Devpost link on screen | "MintGuard — verify before you mint." |

## Recording notes

- Do a dry run first: verify all three demo contracts once so Nano (if downloading) is ready before recording.
- If Nano is unavailable on the recording machine, the cloud fallback still shows the same flow — say so in the narration instead of faking the label.
- Keep the Firebase config out of frame (env vars, never on screen).
- Export, upload to YouTube as Public, and paste the link into the Devpost submission.
