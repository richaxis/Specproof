# Agent notes
- Contract: `contracts/spec_proof.py`, GenLayer v0.3.0 syntax, header lines 1-2 must stay exactly as they are (hash-pinned dependency).
- Money logic is deterministic; only `assess` is non-deterministic and returns categorical statuses only.
- Run `python3 scripts/verify.py` after any contract change.
- Frontend reads JSON strings from view methods; amounts are decimal strings (wei).
