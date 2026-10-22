# SpecProof

**Delivery guarantees judged by GenLayer consensus.** A creator seals a weighted list of promised product
features. Backers lock GEN in escrow. After shipping, GenLayer validators read the public delivery page and rate
each promise `MET`, `PARTIAL` or `MISSED`. Deterministic code then pays the creator for what arrived and
refunds backers pro-rata for what did not.

## Why GenLayer is central

Deciding whether "up to 14 h in testing" satisfies "20 h battery" is a semantic judgement a normal smart
contract cannot make. The Intelligent Contract (`contracts/spec_proof.py`) fetches the delivery page inside a
non-deterministic block, asks an LLM for a categorical verdict, and reaches validator consensus with
`gl.eq_principle.prompt_comparative`. Everything else (custody, weights, arithmetic, claims) is plain code.

## State machine

`OPEN → LOCKED → SETTLED | REFUNDABLE`, or `OPEN → CANCELLED`.
`LOCKED → REFUNDABLE` is also reachable through `recover` once 7 days have passed without a verdict (see below).

| Step | Who | Method |
| --- | --- | --- |
| Seal promise | creator | `create_guarantee` |
| Back / withdraw | backers | `back` (payable), `withdraw` |
| Close backing | creator | `lock` (or `cancel`) |
| Verdict | anyone | `assess` (3 unreadable results → full refunds) |
| Recovery | anyone | `recover` (locked 7 days, still unresolved → full refunds) |
| Payout | creator / backers | `claim_proceeds`, `claim_refund` |

Settlement: `delivered = Σ weight × {MET 100%, PARTIAL 50%, MISSED 0%}`; the creator earns `pot × delivered`,
backers share the remainder pro-rata to stake.

## Locked-fund recovery

`lock` records the contract clock (`gl.message_raw["datetime"]`) and refuses to lock if no clock is available, so funds never lock
without an exit. If `assess` cannot complete (failed transactions, no validator agreement, persistent retrieval errors), the attempt
counter does not advance. After `RECOVERY_SECONDS` (7 days) anyone may call `recover`: the pool becomes `REFUNDABLE` and every backer
claims a full refund. The creator receives nothing in that case.

## Layout

```
contracts/     spec_proof.py (Intelligent Contract, v0.3.0 syntax)
app/           Next.js pages: landing, dashboard, create, guarantee detail
components/    header, footer, SVG visuals, tiles
lib/           network config, GenLayer client wrapper, data hooks, demo data
tests/unit/    27 in-memory tests (state machine, maths, recovery)
tests/direct/  official GenLayer Direct Mode tests (validator agreement, failure recovery)
.github/       CI that runs both test suites
scripts/       verify.py (header checks + tests)
deployments/   studio-next.json (fill in after deploying)
docs/          architecture, contract API, design notes, testing
```

## Configure

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_CONTRACT_ADDRESS`. With no address the site runs on
clearly labelled demo data.

## Verify locally

```bash
python3 scripts/verify.py                         # contract checks + 27 unit tests
pip install -r requirements-dev.txt && pytest     # Direct Mode tests (Python 3.12+)
npm run lint && npm run build
```

## Honest scope

SpecProof compares what a public page says with a sealed promise. It does not prove product quality, legal
entitlement or that the page is truthful. Absence of a feature on the page counts as `MISSED`. Rounding dust
(< number of backers in wei) stays in the contract.
