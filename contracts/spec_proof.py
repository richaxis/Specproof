# v0.3.0
# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

import datetime
import json
import genlayer as gl
from genlayer.types import *

# ---------------------------------------------------------------------------
# SpecProof: a delivery guarantee for pre-orders and crowdfunding.
#
# A creator seals a list of promised features (with weights). Backers lock GEN.
# When the creator locks the pool, anyone may ask validators to read the public
# delivery page and rate each promised feature MET / PARTIAL / MISSED.
# Deterministic code then splits the escrow: the delivered share goes to the
# creator, the undelivered share is refunded to backers pro-rata.
# ---------------------------------------------------------------------------

BPS = 10000
MAX_FEATURES = 6
MAX_TITLE = 80
MAX_TEXT = 240
MAX_URL = 300
MAX_PAGE_CHARS = 24000
MAX_ATTEMPTS = 3
# A locked pool that no verdict has settled can be refunded in full after this long.
RECOVERY_SECONDS = 7 * 24 * 3600

STATUS_SCORE = {"MET": 10000, "PARTIAL": 5000, "MISSED": 0}

OPEN = "OPEN"
LOCKED = "LOCKED"
SETTLED = "SETTLED"
REFUNDABLE = "REFUNDABLE"
CANCELLED = "CANCELLED"


def dumps(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def clean_json(raw: str):
    """Pull the first JSON object out of an LLM answer; None if impossible."""
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        return json.loads(raw[start : end + 1])
    except Exception:
        return None


def normalise_verdict(raw: str, feature_ids) -> str:
    """Reduce a free-form LLM answer to a tiny categorical verdict.

    Only categories survive, never prose, so validators can compare results.
    Anything malformed collapses to readable=False (fail closed).
    """
    data = clean_json(raw)
    if not isinstance(data, dict) or data.get("readable") is not True:
        return dumps({"features": {}, "readable": False})
    rated = data.get("features")
    if not isinstance(rated, dict):
        return dumps({"features": {}, "readable": False})
    out = {}
    for fid in feature_ids:
        status = str(rated.get(fid, "MISSED")).strip().upper()
        out[fid] = status if status in STATUS_SCORE else "MISSED"
    return dumps({"features": out, "readable": True})


def now_seconds():
    """Message clock in whole seconds, or None when the node does not provide one."""
    try:
        stamp = str(gl.message_raw["datetime"]).replace("Z", "+00:00")
        return int(datetime.datetime.fromisoformat(stamp).timestamp())
    except Exception:
        return None


def is_https(url: str) -> bool:
    return url.startswith("https://") and 12 <= len(url) <= MAX_URL and " " not in url


@gl.evm.contract_interface
class _Wallet:
    class View:
        pass

    class Write:
        pass


class SpecProof(gl.contract.Contract):
    guarantees: gl.storage.TreeMap[u256, str]
    stakes: gl.storage.TreeMap[str, u256]
    claimed: gl.storage.TreeMap[str, bool]
    next_id: u256

    def __init__(self):
        self.next_id = 1

    # ------------------------------------------------------------------ helpers

    def _load(self, gid: int) -> dict:
        raw = self.guarantees.get(gid, "")
        if raw == "":
            raise gl.vm.UserError("UNKNOWN_GUARANTEE")
        return json.loads(raw)

    def _save(self, gid: int, g: dict) -> None:
        self.guarantees[gid] = dumps(g)

    def _me(self) -> str:
        return gl.message.sender_address.as_hex.lower()

    def _stake_key(self, gid: int, who: str) -> str:
        return str(gid) + ":" + who

    def _pay(self, who: str, amount: int) -> None:
        if amount > 0:
            _Wallet(Address(who)).emit_transfer(value=u256(amount))

    # ------------------------------------------------------------------ creator

    @gl.public.write
    def create_guarantee(
        self, title: str, promise_url: str, delivery_url: str, features_json: str
    ) -> None:
        title = title.strip()
        if not (3 <= len(title) <= MAX_TITLE):
            raise gl.vm.UserError("BAD_TITLE")
        if not is_https(promise_url) or not is_https(delivery_url):
            raise gl.vm.UserError("BAD_URL")
        try:
            raw = json.loads(features_json)
        except Exception:
            raise gl.vm.UserError("BAD_FEATURES")
        if not isinstance(raw, list) or not (1 <= len(raw) <= MAX_FEATURES):
            raise gl.vm.UserError("BAD_FEATURE_COUNT")
        features = []
        total = 0
        for i, item in enumerate(raw):
            if not isinstance(item, dict):
                raise gl.vm.UserError("BAD_FEATURES")
            text = str(item.get("text", "")).strip()
            weight = item.get("weight")
            if not (3 <= len(text) <= MAX_TEXT):
                raise gl.vm.UserError("BAD_FEATURE_TEXT")
            if not isinstance(weight, int) or isinstance(weight, bool) or weight <= 0:
                raise gl.vm.UserError("BAD_WEIGHT")
            total += weight
            features.append({"id": "f" + str(i + 1), "text": text, "weight": weight})
        if total != BPS:
            raise gl.vm.UserError("WEIGHTS_MUST_SUM_TO_10000")

        gid = int(self.next_id)
        self.next_id = gid + 1
        self._save(
            gid,
            {
                "id": gid,
                "creator": self._me(),
                "title": title,
                "promise_url": promise_url,
                "delivery_url": delivery_url,
                "features": features,
                "state": OPEN,
                "pot": "0",
                "backers": 0,
                "attempts": 0,
                "statuses": {},
                "locked_at": 0,
                "recover_at": 0,
                "delivered_bps": 0,
                "refund_pool": "0",
                "creator_due": "0",
                "creator_claimed": False,
            },
        )

    @gl.public.write
    def lock(self, gid: int) -> None:
        g = self._load(gid)
        if self._me() != g["creator"]:
            raise gl.vm.UserError("ONLY_CREATOR")
        if g["state"] != OPEN:
            raise gl.vm.UserError("NOT_OPEN")
        if int(g["pot"]) == 0:
            raise gl.vm.UserError("NO_BACKING")
        # Never lock funds without a way out: the recovery deadline needs a clock.
        now = now_seconds()
        if now is None:
            raise gl.vm.UserError("CLOCK_UNAVAILABLE")
        g["state"] = LOCKED
        g["locked_at"] = now
        g["recover_at"] = now + RECOVERY_SECONDS
        self._save(gid, g)

    @gl.public.write
    def recover(self, gid: int) -> None:
        """Escape hatch: if a locked pool is still unresolved after RECOVERY_SECONDS
        (failed transactions, no consensus, persistent retrieval errors), anyone may
        move it to REFUNDABLE so every backer can claim a full refund."""
        g = self._load(gid)
        if g["state"] != LOCKED:
            raise gl.vm.UserError("NOT_LOCKED")
        now = now_seconds()
        if now is None:
            raise gl.vm.UserError("CLOCK_UNAVAILABLE")
        if now < int(g["recover_at"]):
            raise gl.vm.UserError("RECOVERY_NOT_YET")
        g["state"] = REFUNDABLE
        g["refund_pool"] = g["pot"]
        g["creator_due"] = "0"
        self._save(gid, g)

    @gl.public.write
    def cancel(self, gid: int) -> None:
        g = self._load(gid)
        if self._me() != g["creator"]:
            raise gl.vm.UserError("ONLY_CREATOR")
        if g["state"] != OPEN:
            raise gl.vm.UserError("NOT_OPEN")
        g["state"] = CANCELLED
        g["refund_pool"] = g["pot"]
        self._save(gid, g)

    @gl.public.write
    def claim_proceeds(self, gid: int) -> None:
        g = self._load(gid)
        if self._me() != g["creator"]:
            raise gl.vm.UserError("ONLY_CREATOR")
        if g["state"] != SETTLED:
            raise gl.vm.UserError("NOT_SETTLED")
        due = int(g["creator_due"])
        if g["creator_claimed"] or due == 0:
            raise gl.vm.UserError("NOTHING_TO_CLAIM")
        g["creator_claimed"] = True
        self._save(gid, g)
        self._pay(g["creator"], due)

    # ------------------------------------------------------------------ backers

    @gl.public.write.payable
    def back(self, gid: int) -> None:
        g = self._load(gid)
        value = int(gl.message.value)
        who = self._me()
        if g["state"] != OPEN:
            raise gl.vm.UserError("NOT_OPEN")
        if value == 0:
            raise gl.vm.UserError("SEND_VALUE")
        if who == g["creator"]:
            raise gl.vm.UserError("CREATOR_CANNOT_BACK")
        key = self._stake_key(gid, who)
        prior = int(self.stakes.get(key, 0))
        if prior == 0:
            g["backers"] = g["backers"] + 1
        self.stakes[key] = prior + value
        g["pot"] = str(int(g["pot"]) + value)
        self._save(gid, g)

    @gl.public.write
    def withdraw(self, gid: int) -> None:
        """Take your stake back while the pool is still OPEN."""
        g = self._load(gid)
        if g["state"] != OPEN:
            raise gl.vm.UserError("NOT_OPEN")
        who = self._me()
        key = self._stake_key(gid, who)
        stake = int(self.stakes.get(key, 0))
        if stake == 0:
            raise gl.vm.UserError("NO_STAKE")
        self.stakes[key] = 0
        g["pot"] = str(int(g["pot"]) - stake)
        g["backers"] = g["backers"] - 1
        self._save(gid, g)
        self._pay(who, stake)

    @gl.public.write
    def claim_refund(self, gid: int) -> None:
        g = self._load(gid)
        if g["state"] not in (SETTLED, REFUNDABLE, CANCELLED):
            raise gl.vm.UserError("NOT_REFUNDABLE")
        who = self._me()
        key = self._stake_key(gid, who)
        stake = int(self.stakes.get(key, 0))
        if stake == 0:
            raise gl.vm.UserError("NO_STAKE")
        if self.claimed.get(key, False):
            raise gl.vm.UserError("ALREADY_CLAIMED")
        pot = int(g["pot"])
        amount = (int(g["refund_pool"]) * stake) // pot if pot > 0 else 0
        self.claimed[key] = True
        self._pay(who, amount)

    # ------------------------------------------------------------- the judgement

    @gl.public.write
    def assess(self, gid: int) -> None:
        """Anyone may ask validators to compare the delivery page with the promise."""
        g = self._load(gid)
        if g["state"] != LOCKED:
            raise gl.vm.UserError("NOT_LOCKED")

        delivery_url = g["delivery_url"]
        ids = [f["id"] for f in g["features"]]
        listing = "\n".join(f["id"] + ": " + f["text"] for f in g["features"])

        def rate_delivery() -> str:
            page = gl.nondet.web.render(delivery_url, mode="text")
            page = page[:MAX_PAGE_CHARS]
            task = f"""You are an impartial auditor checking whether a shipped product delivers what was promised.

PROMISED FEATURES (sealed before shipping):
{listing}

PUBLIC DELIVERY PAGE (spec sheet or release notes):
{page}
END OF PAGE

For every promised feature id, choose exactly one status:
- "MET": the page clearly shows the feature delivered as promised, or better.
- "PARTIAL": the page shows it delivered but weaker than promised (for example a lower number, fewer items, a reduced scope).
- "MISSED": the page does not show it, or contradicts it.
If the page is empty, an error page, or unrelated to the promised product, set "readable" to false.

Respond with ONLY this JSON and nothing else:
{{"readable": true, "features": {{"f1": "MET"}}}}
Use every feature id above as a key under "features"."""
            answer = gl.nondet.exec_prompt(task)
            return normalise_verdict(answer, ids)

        # The answer is reduced to categories only, so validators must agree exactly.
        verdict = json.loads(gl.eq_principle.strict_eq(rate_delivery))

        pot = int(g["pot"])
        if verdict.get("readable") is not True:
            g["attempts"] = g["attempts"] + 1
            if g["attempts"] >= MAX_ATTEMPTS:
                g["state"] = REFUNDABLE
                g["refund_pool"] = str(pot)
                g["creator_due"] = "0"
            self._save(gid, g)
            return

        statuses = verdict["features"]
        delivered = 0
        for f in g["features"]:
            status = statuses.get(f["id"], "MISSED")
            delivered += f["weight"] * STATUS_SCORE.get(status, 0) // BPS
        refund = pot * (BPS - delivered) // BPS
        g["statuses"] = statuses
        g["delivered_bps"] = delivered
        g["refund_pool"] = str(refund)
        g["creator_due"] = str(pot - refund)
        g["state"] = SETTLED
        self._save(gid, g)

    # -------------------------------------------------------------------- views

    @gl.public.view
    def get_guarantee(self, gid: int) -> str:
        return dumps(self._load(gid))

    @gl.public.view
    def list_guarantees(self) -> str:
        out = []
        for gid in range(1, int(self.next_id)):
            g = json.loads(self.guarantees.get(gid, "{}"))
            if g:
                out.append(
                    {
                        "id": g["id"],
                        "title": g["title"],
                        "creator": g["creator"],
                        "state": g["state"],
                        "pot": g["pot"],
                        "backers": g["backers"],
                        "delivered_bps": g["delivered_bps"],
                        "features": len(g["features"]),
                    }
                )
        return dumps(out)

    @gl.public.view
    def get_stake(self, gid: int, account: str) -> str:
        key = self._stake_key(gid, account.lower())
        return dumps(
            {
                "stake": str(int(self.stakes.get(key, 0))),
                "claimed": bool(self.claimed.get(key, False)),
            }
        )

    @gl.public.view
    def get_stats(self) -> str:
        total = 0
        counts = {OPEN: 0, LOCKED: 0, SETTLED: 0, REFUNDABLE: 0, CANCELLED: 0}
        for gid in range(1, int(self.next_id)):
            g = json.loads(self.guarantees.get(gid, "{}"))
            if g:
                total += int(g["pot"])
                counts[g["state"]] = counts[g["state"]] + 1
        return dumps(
            {
                "guarantees": int(self.next_id) - 1,
                "total_escrow": str(total),
                "by_state": counts,
                "version": "specproof/0.2.0",
            }
        )
