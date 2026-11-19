# MintGuardRegistry — attestation contract (Agent ID Hackathon)

Status: **WRITTEN, COMPILED, PREVIEWED, NOT DEPLOYED.** No address on-chain yet
(the deterministic CREATE2 address is computed, not deployed — see below).
Do not deploy without Eaglee's explicit approval — deploying is an on-chain
transaction (gas only, value 0) and needs a re-paired Binance Agentic wallet.

## What it is

`MintGuardRegistry.sol` is the minimal on-chain companion to MintGuard
(`~/workspace/buildhybridai/`, live at https://mintguard-96088.web.app).
MintGuard itself stays off-chain and read-only; this contract is only a
public, appendable record of its verdicts:

- one attestation per BSC contract address: `target`, `riskScore` (0–100),
  `verdict` (`SAFE` / `CAUTION` / `DANGEROUS`), `agentIdHandle`
  (e.g. `astrajingga0704`, or `""` when no Agent ID was checked),
  `timestamp`, `attestedBy`.
- written only by the owner (the deployer), readable by anyone.
- every write emits `Attested`; overwriting an address is intentional
  (re-verification updates the latest attestation, history stays in events).

It holds **no funds and has no payable function** — no BNB, no token,
no mint, no withdraw. The Agent ID check itself stays in `src/agentid.js`
(read-only `handleOf(address)` on the SPACE ID HandleRegistry
`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`); this registry only records
the handle string that was verified alongside a check.

## Functions

| Function | Who | What |
| --- | --- | --- |
| `attest(target, riskScore, verdict, agentIdHandle)` | owner only | Write/overwrite one attestation. Reverts on zero address, `riskScore > 100`, empty verdict. |
| `getAttestation(target)` | anyone (view) | Latest attestation for an address. |
| `attestations(target)` | anyone (view) | Auto-generated getter for the mapping. |
| `hasAttestation(target)` | anyone (view) | Whether an address was ever attested. |
| `getAttestedContracts()` | anyone (view) | All attested addresses, in order. |
| `attestationCount()` | anyone (view) | Number of distinct attested addresses. |
| `owner()` | anyone (view) | Current owner. |
| `transferOwnership(newOwner)` | owner only | Move ownership (e.g. to a multisig). |

## Compile — verified 19 Nov 2026

Single file, no imports, Solidity `^0.8.20`, SPDX `Apache-2.0`
(matches the repo `LICENSE`).

```bash
# solc 0.8.28 (solcjs, installed in /tmp/mintguard-solc — not in this repo)
node /tmp/mintguard-solc/compile.js
# COMPILE_OK — no errors, no warnings shown
```

Measured output (optimizer off):

- creation bytecode: **6,471 bytes**
- deployed bytecode: **6,290 bytes**
- solc `creation.totalCost`: **1,285,113 gas**
  = `codeDepositCost` 1,258,000 (200 gas × 6,290 deployed bytes)
  + `executionCost` 27,113
- plus the 21,000 base transaction cost solc does **not** include:
  **estimated deploy transaction ≈ 1,285,113 + 21,000 = 1,306,113 gas**

BNB cost = 1,306,113 × gas price at deploy time. Example only, not a
live gas price: at 1 gwei that is 0.001306113 BNB; at 3 gwei, 0.003918339 BNB.
Check the live BSC gas price before deploying and confirm with Eaglee.

Per-call estimates from solc (views are free off-chain): `owner()` 2,507,
`hasAttestation()` 2,877, `attestationCount()` 2,462,
`transferOwnership()` 30,673 gas. `attest()` reports `infinite` in solc
because its cost depends on the string lengths and cold/warm storage
(first write to a new address costs more than overwriting); budget it
as a normal SSTORE-heavy write, not as a fixed number.

## Deploy — via CREATE2 factory (19 Nov 2026, verified)

The Binance Agentic Wallet CLI (`baw` 1.12.0) has **no deploy command** and
`contract-call preview` rejects a missing `--to` (`to is required for EVM
contract-call`, tested 19 Nov 18:2x WIB). A bare contract-creation
transaction cannot be sent through it. The working path is the
**Arachnid deterministic deployment proxy**
`0x4e59b44847b379578588920cA78FbF26c0B4956C` (verified on-chain on BSC via
`eth_getCode`, 19 Nov 2026; semantics from the official repo README:
send a transaction TO the proxy, data = 32-byte salt + init code, it
deploys via CREATE2). Because the proxy is `msg.sender` at deploy time,
the constructor takes `initialOwner` (Eaglee's wallet) explicitly —
otherwise the factory would own the registry.

Fresh numbers, 19 Nov 2026 ~18:2x WIB:
- Wallet CONNECTED, Developer Mode enabled until 2026-11-26 17:50 WIB,
  session until 2026-11-21 16:38 WIB. BNB balance 0.001017892451671011.
- Gas price: BSC RPC 0.05 gwei; BAW low 0.059 / medium 0.068 gwei.
- Recompiled with `constructor(address initialOwner)`: creation bytecode
  6,916 bytes, deployed 6,290 bytes (solc 0.8.28, optimizer off).
- Init code = creation bytecode + ABI-encoded owner
  `0x822854cfDb5A8a8e57e62F0F2214D8d974D4B562`.
- `eth_estimateGas` (two public RPCs agree): **1,469,010 gas** for the
  proxy call → ≈ 0.0000735 BNB at 0.05 gwei (≈ 7.2% of balance),
  ≈ 0.0000867 BNB at 0.059 gwei (≈ 8.5%).
- CREATE2 address (salt = 32 zero bytes, EIP-1014, computed locally with
  js-sha3): **`0x8b224e13cc20df552766dd41a2531b46f09a9457`** — verified
  empty on-chain (`eth_getCode` = `0x`) before deploy.
- BAW preview OK 19 Nov ~18:24 WIB: requestId
  `aeb08646847e42a184d017cbb6a6cbdc`, simulationCode `000000000`, no error,
  no risks, no allowance/authority changes, value 0,
  `requireConfirmation: false`. **Preview approvals are short-lived and
  hash-bound to this exact payload — if Eaglee confirms later, re-preview
  fresh before executing; never execute from this stale requestId.**

## Verify on BscScan (after deploy)

1. Deploy via the proxy call above (value 0; backend estimates gas).
2. Confirm `eth_getCode` at `0x8b224e13cc20df552766dd41a2531b46f09a9457`
   is non-empty and `owner()` returns Eaglee's wallet.
3. On BscScan → Verify & Publish, single file `MintGuardRegistry.sol`.
4. Compiler: **0.8.28**, EVM version default, Optimization: **No**,
   constructor arguments: **one address** — the ABI-encoded owner
   `0x822854cfDb5A8a8e57e62F0F2214D8d974D4B562` (32-byte left-padded),
   license: **Apache-2.0**.
5. Confirm the verified source matches this file byte-for-byte, then paste
   the BscScan link into the hackathon survey (Q10) and flip Q11 to Yes.

## What NOT to do

- Do not list the Agent ID HandleRegistry (`0x60B926…`) as MintGuard's
  project contract — it belongs to SPACE ID / Binance, MintGuard only reads it.
- Do not list PIXIU / Pokechain / PXIO as project contracts — they are demo
  contracts MintGuard *checks*, not contracts MintGuard owns.
- Do not deploy from any wallet other than Eaglee's, and do not deploy
  while the Binance Agentic session is expired (re-paired 19 Nov 16:38 WIB,
  valid until 21 Nov 16:38 WIB; always re-check `baw wallet status` fresh).
