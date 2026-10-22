# Architecture
Browser (Next.js) → `genlayer-js` client (Studio Next, chain 61997) → `SpecProof` Intelligent Contract.

Storage: `guarantees` (id → JSON), `stakes` (`id:address` → wei), `claimed` (`id:address` → bool), `next_id`.
Amounts inside JSON are decimal strings so the browser never loses precision.

Consensus: `assess` runs `rate_delivery` in a non-deterministic block. The leader fetches the page, prompts the LLM and
reduces the answer to `{readable, features:{id:status}}`. Validators repeat the work and `strict_eq` requires the identical
categorical result. Because only categories survive (never prose), exact agreement is meaningful and testable. If validators
disagree the transaction does not settle; the recovery path below covers that case. Prose never enters storage.

Failure handling: an unreadable page increments `attempts`; the third failure moves the pool to `REFUNDABLE` (full refund).

Recovery: `lock` stores `locked_at` / `recover_at = locked_at + 7 days`. `recover` (anyone, LOCKED only, after the deadline) moves the
pool to `REFUNDABLE` with `refund_pool = pot`, so every backer can `claim_refund` in full.
