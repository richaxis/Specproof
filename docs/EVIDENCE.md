# Live evidence (Studio Next, chain 61997)

Contract: `PASTE_CONTRACT_ADDRESS`   Explorer: https://explorer-studio-dev.genlayer.com/address/PASTE_CONTRACT_ADDRESS

How this was produced: the site's **Evidence** page logs every transaction sent from the browser; its **Copy as text** button
produced the list below, and **Copy state as text** on the guarantee page produced the final state.

| # | Step | Wallet | Transaction |
| --- | --- | --- | --- |
| 1 | Create guarantee | creator | PASTE |
| 2 | Back (10 GEN) | backer A | PASTE |
| 3 | Back (30 GEN) | backer B | PASTE |
| 4 | Lock | creator | PASTE |
| 5 | Assess (GenLayer validators) | any | PASTE |
| 6 | Claim proceeds | creator | PASTE |
| 7 | Claim refund | backer A | PASTE |
| 8 | Claim refund | backer B | PASTE |

Final state (paste "Copy state as text"):

```
PASTE
```

GEN transfers: 6 and 7/8 appear in the explorer as transfers from the contract to the creator and the backers; creator payout plus
refunds equals the 40 GEN escrow.

Recovery path: proven by unit tests and Direct Mode tests (7-day deadline); it is not run live because it needs 7 days to elapse.
