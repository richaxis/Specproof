# Live evidence (GenLayer Studio Next, chain 61997)

**Contract:** `0x62f0efc16a963723962E42D74B69F17E79Ad637d`
**Explorer:** https://explorer-studio-dev.genlayer.com/address/0x62f0efc16a963723962E42D74B69F17E79Ad637d

## How this was produced

Every action sent from the SpecProof site is logged on its **Evidence** page, with the explorer link. An action is only logged
after the site has confirmed that the transaction reached a decision (Accepted or Finalized) and that the contract execution
returned successfully. Failed transactions are not logged. The table below is that log, copied from the page.

## Transactions

| # | Action | Guarantee | Transaction |
| --- | --- | --- | --- |
| 1 | Create guarantee (`create_guarantee`) | new (#1) | [0x637c4c2fc798427c2ff2373f9e4463a0cb52ab8e98861852f2e85fb357920927](https://explorer-studio-dev.genlayer.com/tx/0x637c4c2fc798427c2ff2373f9e4463a0cb52ab8e98861852f2e85fb357920927) |
| 2 | Back (`back`, payable, GEN escrowed) | #1 | [0x8d562429d37d92fd5d0fcb7c32571fc0b69364fe74eec76601d7dbc3fc7dcd77](https://explorer-studio-dev.genlayer.com/tx/0x8d562429d37d92fd5d0fcb7c32571fc0b69364fe74eec76601d7dbc3fc7dcd77) |
| 3 | Cancel (`cancel`, creator closes the OPEN pool) | #1 | [0x6e1712b1a2a85a4b9ee1ddaa3fae00f644fd51941c4a5747f703d061b8e311f8](https://explorer-studio-dev.genlayer.com/tx/0x6e1712b1a2a85a4b9ee1ddaa3fae00f644fd51941c4a5747f703d061b8e311f8) |

## What this shows

- A guarantee with sealed weighted features was created on Studio Next (transaction 1).
- A backer escrowed GEN into it (transaction 2).
- The creator cancelled the still-open pool (transaction 3). By contract rule the state becomes `CANCELLED` and the refund pool
  equals the full escrow, so the backer can claim a full refund.

## Not yet shown in this evidence

The lock, GenLayer assessment and settlement steps (`lock`, `assess`, `claim_proceeds`, `claim_refund`) are not part of this log.
Their behaviour is covered by the unit tests (`tests/unit`) and the Direct Mode tests (`tests/direct`), which run on every push
(see `.github/workflows/tests.yml`). A live run of those steps will be appended here as further rows of the same table.
