// Node test for src/verifier.js against the 3 demo contracts.
// Run: node test/verifier.test.mjs
import { verifyContract } from "../src/verifier.js";

const DEMO = [
  { label: "PIXIU (expected: verified)", address: "0x5777c2f59c65003ddebb018517b09f7ba0691202" },
  { label: "Pokechain (expected: NOT verified)", address: "0x4EF929aF00cB93993c3D01834C4DA79200d31e32" },
  { label: "PXIO (expected: verified)", address: "0x58e8f1b34B60687B36BCdc78e02a2fd443De71Ab" },
];

let failures = 0;
for (const { label, address } of DEMO) {
  console.log(`\n===== ${label} =====`);
  console.log(`Address: ${address}`);
  try {
    const { facts, checks, riskScore, verdict } = await verifyContract(address, (m) =>
      console.log(`  … ${m}`),
    );
    console.log(`hasCode: ${facts.hasCode} (${facts.bytecodeLength} bytes)`);
    console.log(`verified: ${facts.verified} (Sourcify status: ${facts.sourcifyStatus})`);
    console.log(`owner: ${facts.owner || "unknown"}${facts.owner ? (facts.ownerIsContract ? " (contract)" : " (EOA)") : ""}`);
    console.log(`totalSupply: ${facts.totalSupply ?? "unknown"}`);
    console.log(`name/symbol: ${facts.name || "?"} / ${facts.symbol || "?"}`);
    console.log(`dangerousFunctions: ${facts.dangerousFunctions.join(", ") || "none"}`);
    console.log(`riskScore: ${riskScore}  verdict: ${verdict}`);
    for (const c of checks) console.log(`  [${c.status}] ${c.label} — ${c.detail}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAILED: ${err.message}`);
  }
}

console.log(`\nDone. failures: ${failures}`);
process.exit(failures ? 1 : 0);
