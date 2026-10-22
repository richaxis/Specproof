# Contract API
Writes: `create_guarantee(title, promise_url, delivery_url, features_json)`, `back(gid)` payable, `withdraw(gid)`,
`lock(gid)`, `cancel(gid)`, `assess(gid)`, `recover(gid)`, `claim_refund(gid)`, `claim_proceeds(gid)`.
Views (return JSON strings): `get_guarantee(gid)`, `list_guarantees()`, `get_stake(gid, account)`, `get_stats()`.
`features_json` example: `[{"text":"Battery lasts 20 hours","weight":6000},{"text":"IP67","weight":4000}]` (weights in basis points, sum 10000, 1-6 features).
Errors: `UserError` codes such as `NOT_OPEN`, `ONLY_CREATOR`, `CREATOR_CANNOT_BACK`, `WEIGHTS_MUST_SUM_TO_10000`.

Recovery errors: `RECOVERY_NOT_YET` (deadline not reached), `CLOCK_UNAVAILABLE` (node gives no clock), `NOT_LOCKED`.
Guarantee JSON also carries `locked_at` and `recover_at` (unix seconds).
