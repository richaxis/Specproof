import importlib.util
import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import genlayer_mock as mock  # noqa: E402

mock.install()
CONTRACT = pathlib.Path(__file__).parents[2] / "contracts" / "spec_proof.py"
spec = importlib.util.spec_from_file_location("spec_proof", CONTRACT)
sp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sp)

CREATOR = "0x" + "c" * 40
ALICE = "0x" + "a" * 40
BOB = "0x" + "b" * 40
FEATURES = json.dumps(
    [
        {"text": "Battery lasts 20 hours", "weight": 5000},
        {"text": "USB-C fast charging", "weight": 3000},
        {"text": "Water resistant IP67", "weight": 2000},
    ]
)
UNIT = 10**18


def as_(who, value=0):
    mock.Message.sender_address = mock.Address(who)
    mock.Message.value = value


def verdict(readable=True, **statuses):
    return json.dumps({"readable": readable, "features": statuses})


class SpecProofTests(unittest.TestCase):
    def setUp(self):
        mock.transfers.clear()
        mock.llm.update(page="Spec sheet", answer="", calls=0, fail=False)
        mock.clock["now"] = "2026-10-20T10:00:00Z"
        self.c = sp.SpecProof()
        as_(CREATOR)
        self.c.create_guarantee(
            "Aurora Buds", "https://example.com/promise", "https://example.com/shipped", FEATURES
        )

    def g(self, gid=1):
        return json.loads(self.c.get_guarantee(gid))

    def fund(self, alice=10, bob=30):
        as_(ALICE, alice * UNIT)
        self.c.back(1)
        as_(BOB, bob * UNIT)
        self.c.back(1)

    def lock_and_assess(self, answer):
        self.fund()
        as_(CREATOR)
        self.c.lock(1)
        mock.llm["answer"] = answer
        as_(ALICE)
        self.c.assess(1)

    # ---- creation -----------------------------------------------------------
    def test_create_seals_features_with_ids(self):
        g = self.g()
        self.assertEqual(g["state"], "OPEN")
        self.assertEqual([f["id"] for f in g["features"]], ["f1", "f2", "f3"])
        self.assertEqual(g["creator"], CREATOR)

    def test_create_validation(self):
        as_(CREATOR)
        bad_weights = json.dumps([{"text": "Something", "weight": 9000}])
        with self.assertRaises(mock.UserError):
            self.c.create_guarantee("Aurora", "https://a.example/x", "https://a.example/y", bad_weights)
        with self.assertRaises(mock.UserError):
            self.c.create_guarantee("Aurora", "http://a.example/x", "https://a.example/y", FEATURES)
        with self.assertRaises(mock.UserError):
            self.c.create_guarantee("Aurora", "https://a.example/x", "https://a.example/y", "nope")
        with self.assertRaises(mock.UserError):
            self.c.create_guarantee("x", "https://a.example/x", "https://a.example/y", FEATURES)

    # ---- backing ------------------------------------------------------------
    def test_back_accumulates_and_withdraw_returns_stake(self):
        self.fund()
        self.assertEqual(self.g()["pot"], str(40 * UNIT))
        self.assertEqual(self.g()["backers"], 2)
        as_(ALICE)
        self.c.withdraw(1)
        self.assertEqual(mock.transfers, [(ALICE, 10 * UNIT)])
        self.assertEqual(self.g()["pot"], str(30 * UNIT))
        self.assertEqual(self.g()["backers"], 1)

    def test_creator_cannot_back_and_zero_rejected(self):
        as_(CREATOR, UNIT)
        with self.assertRaises(mock.UserError):
            self.c.back(1)
        as_(ALICE, 0)
        with self.assertRaises(mock.UserError):
            self.c.back(1)

    def test_only_creator_locks_and_needs_backing(self):
        as_(CREATOR)
        with self.assertRaises(mock.UserError):
            self.c.lock(1)
        self.fund()
        as_(ALICE)
        with self.assertRaises(mock.UserError):
            self.c.lock(1)

    def test_no_backing_or_withdraw_after_lock(self):
        self.fund()
        as_(CREATOR)
        self.c.lock(1)
        as_(ALICE, UNIT)
        with self.assertRaises(mock.UserError):
            self.c.back(1)
        as_(ALICE)
        with self.assertRaises(mock.UserError):
            self.c.withdraw(1)

    # ---- assessment ---------------------------------------------------------
    def test_assess_requires_locked(self):
        as_(ALICE)
        with self.assertRaises(mock.UserError):
            self.c.assess(1)

    def test_all_met_pays_creator_everything(self):
        self.lock_and_assess(verdict(f1="MET", f2="MET", f3="MET"))
        g = self.g()
        self.assertEqual(g["state"], "SETTLED")
        self.assertEqual(g["delivered_bps"], 10000)
        self.assertEqual(g["refund_pool"], "0")
        as_(CREATOR)
        self.c.claim_proceeds(1)
        self.assertEqual(mock.transfers, [(CREATOR, 40 * UNIT)])

    def test_partial_and_missed_split_pro_rata(self):
        # f1 PARTIAL (50% of 50%) + f2 MET (30%) + f3 MISSED = 55% delivered
        self.lock_and_assess(verdict(f1="PARTIAL", f2="MET", f3="MISSED"))
        g = self.g()
        self.assertEqual(g["delivered_bps"], 5500)
        self.assertEqual(int(g["refund_pool"]), 18 * UNIT)
        self.assertEqual(int(g["creator_due"]), 22 * UNIT)
        as_(ALICE)
        self.c.claim_refund(1)
        as_(BOB)
        self.c.claim_refund(1)
        as_(CREATOR)
        self.c.claim_proceeds(1)
        paid = dict(mock.transfers)
        self.assertEqual(paid[ALICE], 45 * UNIT // 10)  # 25% of 18
        self.assertEqual(paid[BOB], 135 * UNIT // 10)  # 75% of 18
        self.assertEqual(paid[CREATOR], 22 * UNIT)
        self.assertEqual(sum(v for _, v in mock.transfers), 40 * UNIT)  # conservation

    def test_all_missed_refunds_everything(self):
        self.lock_and_assess(verdict(f1="MISSED", f2="MISSED", f3="MISSED"))
        self.assertEqual(self.g()["creator_due"], "0")
        as_(CREATOR)
        with self.assertRaises(mock.UserError):
            self.c.claim_proceeds(1)

    def test_garbled_status_collapses_to_missed(self):
        self.lock_and_assess(verdict(f1="AMAZING", f2="MET", f3="met"))
        self.assertEqual(self.g()["statuses"], {"f1": "MISSED", "f2": "MET", "f3": "MET"})

    def test_markdown_fences_are_tolerated(self):
        self.lock_and_assess("```json\n" + verdict(f1="MET", f2="MET", f3="MET") + "\n```")
        self.assertEqual(self.g()["state"], "SETTLED")

    def test_unreadable_retries_then_becomes_refundable(self):
        self.fund()
        as_(CREATOR)
        self.c.lock(1)
        mock.llm["answer"] = verdict(readable=False)
        for expected in ("LOCKED", "LOCKED", "REFUNDABLE"):
            as_(ALICE)
            self.c.assess(1)
            self.assertEqual(self.g()["state"], expected)
        as_(ALICE)
        self.c.claim_refund(1)
        as_(BOB)
        self.c.claim_refund(1)
        self.assertEqual(dict(mock.transfers), {ALICE: 10 * UNIT, BOB: 30 * UNIT})

    def test_non_json_answer_fails_closed(self):
        self.fund()
        as_(CREATOR)
        self.c.lock(1)
        mock.llm["answer"] = "I think it is fine!"
        as_(ALICE)
        self.c.assess(1)
        g = self.g()
        self.assertEqual((g["state"], g["attempts"]), ("LOCKED", 1))

    def test_prompt_contains_sealed_promise(self):
        self.lock_and_assess(verdict(f1="MET", f2="MET", f3="MET"))
        self.assertIn("Battery lasts 20 hours", mock.llm["task"])

    def test_assess_cannot_replay_after_settlement(self):
        self.lock_and_assess(verdict(f1="MET", f2="MET", f3="MET"))
        as_(ALICE)
        with self.assertRaises(mock.UserError):
            self.c.assess(1)

    # ---- claims -------------------------------------------------------------
    def test_double_claim_and_stranger_claim_rejected(self):
        self.lock_and_assess(verdict(f1="MISSED", f2="MISSED", f3="MISSED"))
        as_(ALICE)
        self.c.claim_refund(1)
        with self.assertRaises(mock.UserError):
            self.c.claim_refund(1)
        as_("0x" + "d" * 40)
        with self.assertRaises(mock.UserError):
            self.c.claim_refund(1)

    def test_cancel_refunds_everyone_in_full(self):
        self.fund()
        as_(ALICE)
        with self.assertRaises(mock.UserError):
            self.c.cancel(1)
        as_(CREATOR)
        self.c.cancel(1)
        for who in (ALICE, BOB):
            as_(who)
            self.c.claim_refund(1)
        self.assertEqual(dict(mock.transfers), {ALICE: 10 * UNIT, BOB: 30 * UNIT})

    def test_creator_double_claim_rejected(self):
        self.lock_and_assess(verdict(f1="MET", f2="MET", f3="MET"))
        as_(CREATOR)
        self.c.claim_proceeds(1)
        with self.assertRaises(mock.UserError):
            self.c.claim_proceeds(1)

    # ---- recovery of unresolved locked pools ------------------------------------
    def lock_only(self):
        self.fund()
        as_(CREATOR)
        self.c.lock(1)

    def test_lock_records_deadline_seven_days_out(self):
        self.lock_only()
        g = self.g()
        self.assertEqual(g["recover_at"] - g["locked_at"], 7 * 24 * 3600)

    def test_lock_refused_without_a_clock(self):
        self.fund()
        mock.clock["now"] = None
        as_(CREATOR)
        with self.assertRaises(mock.UserError):
            self.c.lock(1)
        self.assertEqual(self.g()["state"], "OPEN")  # funds still withdrawable

    def test_recover_refused_before_deadline(self):
        self.lock_only()
        mock.clock["now"] = "2026-10-27T09:59:59Z"
        as_(ALICE)
        with self.assertRaises(mock.UserError):
            self.c.recover(1)
        self.assertEqual(self.g()["state"], "LOCKED")

    def test_persistent_evidence_failure_then_timeout_refunds_everyone(self):
        self.lock_only()
        mock.llm["fail"] = True  # retrieval raises every time: attempts never advance
        for _ in range(5):
            as_(ALICE)
            with self.assertRaises(RuntimeError):
                self.c.assess(1)
        g = self.g()
        self.assertEqual((g["state"], g["attempts"]), ("LOCKED", 0))
        mock.clock["now"] = "2026-10-27T10:00:00Z"
        as_(BOB)  # anyone may trigger recovery
        self.c.recover(1)
        g = self.g()
        self.assertEqual((g["state"], g["refund_pool"], g["creator_due"]), ("REFUNDABLE", str(40 * UNIT), "0"))
        for who in (ALICE, BOB):
            as_(who)
            self.c.claim_refund(1)
        self.assertEqual(dict(mock.transfers), {ALICE: 10 * UNIT, BOB: 30 * UNIT})
        self.assertEqual(sum(v for _, v in mock.transfers), 40 * UNIT)

    def test_recover_only_from_locked(self):
        mock.clock["now"] = "2027-01-01T00:00:00Z"
        as_(ALICE)
        with self.assertRaises(mock.UserError):  # still OPEN
            self.c.recover(1)
        self.lock_and_assess(verdict(f1="MET", f2="MET", f3="MET"))
        with self.assertRaises(mock.UserError):  # already SETTLED
            self.c.recover(1)

    def test_recover_cannot_be_replayed_and_creator_gets_nothing(self):
        self.lock_only()
        mock.clock["now"] = "2026-11-01T00:00:00Z"
        as_(ALICE)
        self.c.recover(1)
        with self.assertRaises(mock.UserError):
            self.c.recover(1)
        as_(CREATOR)
        with self.assertRaises(mock.UserError):
            self.c.claim_proceeds(1)

    def test_assess_after_recover_is_rejected(self):
        self.lock_only()
        mock.clock["now"] = "2026-11-01T00:00:00Z"
        as_(ALICE)
        self.c.recover(1)
        mock.llm["answer"] = verdict(f1="MET", f2="MET", f3="MET")
        with self.assertRaises(mock.UserError):
            self.c.assess(1)

    # ---- views --------------------------------------------------------------
    def test_views(self):
        self.fund()
        listing = json.loads(self.c.list_guarantees())
        self.assertEqual(listing[0]["pot"], str(40 * UNIT))
        stats = json.loads(self.c.get_stats())
        self.assertEqual(stats["guarantees"], 1)
        self.assertEqual(stats["by_state"]["OPEN"], 1)
        stake = json.loads(self.c.get_stake(1, ALICE.upper().replace("0X", "0x")))
        self.assertEqual(stake["stake"], str(10 * UNIT))
        with self.assertRaises(mock.UserError):
            self.c.get_guarantee(99)


if __name__ == "__main__":
    unittest.main()
