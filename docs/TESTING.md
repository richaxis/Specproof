# Testing

## 1. Unit tests (27, in-memory)
`python3 scripts/verify.py` runs `tests/unit/test_spec_proof.py` against `tests/unit/genlayer_mock.py`, a stand-in for the `genlayer`
module (scripted LLM and web, recorded transfers, controllable clock). Covers validation, custody, pro-rata maths, conservation of
funds, replay and wrong-actor attempts, retry-to-refund, cancellation, and recovery: lock deadline, no lock without a clock,
refusal before the deadline, persistent retrieval failure then timeout then full refunds, replay and wrong-state attempts.
The mock executes only the leader function, so it does not prove validator agreement.

## 2. Official Direct Mode tests (4)
`tests/direct/test_spec_proof_direct.py` runs the real contract in GenVM Direct Mode (`genlayer-test` plugin) with mocked web and LLM:
- assessment settles and a validator replay agrees (`run_validator()` is True)
- a validator that sees a different verdict disagrees (`run_validator()` is False)
- three unreadable results make the pool refundable
- a stalled locked pool is refused before 7 days, then recovered and refunded after

Run: `pip install -r requirements-dev.txt && pytest tests/direct -v` (Python 3.12+). The GitHub Actions workflow
`.github/workflows/tests.yml` runs both suites and the contract linter on every push; its green check is the execution evidence.

## 3. Live evidence
See `docs/EVIDENCE.md`.
