// Firebase setup: App + App Check + AI Logic (Firebase AI Logic SDK).
// All config comes from env vars (see README.md). Missing config only disables
// the AI step — on-chain checks still work. Never commit secrets or debug tokens.
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

if (!firebaseConfigured) {
  console.warn(
    "[MintGuard] Firebase config missing — set VITE_FIREBASE_* env vars (see README.md). " +
      "AI analysis disabled; on-chain checks still work.",
  );
}

let app = null;
let verifierModel = null;

if (firebaseConfigured) {
  app = initializeApp(firebaseConfig);

  // App Check: the debug token is enabled ONLY on localhost, before init.
  // On a hosted demo, reCAPTCHA Enterprise is used with the site key from env.
  try {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";
    if (isLocalhost) {
      // When this flag is set, the SDK uses the debug provider instead of the
      // configured one — the placeholder below is never exercised.
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey || "debug-token-only-localhost"),
        isTokenAutoRefreshEnabled: true,
      });
      console.info(
        "[MintGuard] App Check: debug token enabled (localhost only). " +
          "Register the printed debug token in the Firebase console.",
      );
    } else if (siteKey) {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else {
      console.warn(
        "[MintGuard] VITE_RECAPTCHA_SITE_KEY not set — App Check disabled on hosted demo.",
      );
    }
  } catch (err) {
    console.warn("[MintGuard] App Check init failed:", err);
  }

  // AI Logic via the free Google AI backend (no Blaze plan required).
  // Hybrid inference: prefer on-device Gemini Nano, fall back to cloud.
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  verifierModel = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
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
  });
}

export { app, verifierModel };
