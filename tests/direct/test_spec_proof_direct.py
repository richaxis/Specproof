"""Official GenLayer Direct Mode tests (genlayer-test plugin).

These run the real contract file inside GenVM's direct runner, with web pages and the
LLM mocked. `run_validator()` replays the non-deterministic block the way a validator
would and says whether it agrees with the leader.

Run:  pip install -r requirements-dev.txt && pytest tests/direct -v
"""
import json

CONTRACT = "contracts/spec_proof.py"
FEATURES = json.dumps(
    [
        {"text": "Battery lasts 20 hours per charge", "weight": 6000},
        {"text": "Active noise cancellation of at least 35 dB", "weight": 4000},
    ]
)
SPEC_URL = r"example\.com/spec\.md"
AUDITOR = r"(?s).*impartial auditor.*"
PAGE = "Aurora Buds final specifications. Battery life: up to 14 hours. Noise cancellation: 35 dB."
GEN = 10**18


def verdict(**statuses):
    return json.dumps({"readable": True, "features": statuses})


def state(contract):
    return json.loads(contract.get_guarantee(1))


def locked_pool(direct_vm, direct_deploy, creator, alice, bob):
    """Deploy, create a guarantee, back it with two wallets, lock it."""
    direct_vm.warp("2026-10-20T10:00:00Z")
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = creator
    contract.create_guarantee("Aurora Buds", "https://example.com/promise", "https://example.com/spec.md", FEATURES)
    for who, amount in ((alice, 10 * GEN), (bob, 30 * GEN)):
        direct_vm.sender = who
        direct_vm.value = amount
        contract.back(1)
    direct_vm.value = 0
    direct_vm.sender = creator
    contract.lock(1)
    return contract


def test_assessment_settles_and_validator_agrees(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    contract = locked_pool(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.mock_web(SPEC_URL, {"status": 200, "body": PAGE})
    direct_vm.mock_llm(AUDITOR, verdict(f1="PARTIAL", f2="MET"))

    direct_vm.sender = direct_alice
    contract.assess(1)

    g = state(contract)
    assert g["state"] == "SETTLED"
    assert g["statuses"] == {"f1": "PARTIAL", "f2": "MET"}
    assert g["delivered_bps"] == 7000  # 60% x 50% + 40% x 100%
    assert int(g["creator_due"]) + int(g["refund_pool"]) == 40 * GEN
    assert direct_vm.run_validator() is True  # a validator reproduces the same verdict


def test_validator_rejects_a_different_verdict(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    contract = locked_pool(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.mock_web(SPEC_URL, {"status": 200, "body": PAGE})
    direct_vm.mock_llm(AUDITOR, verdict(f1="PARTIAL", f2="MET"))
    direct_vm.sender = direct_alice
    contract.assess(1)

    direct_vm.clear_mocks()  # the validator now "sees" a different answer
    direct_vm.mock_web(SPEC_URL, {"status": 200, "body": PAGE})
    direct_vm.mock_llm(AUDITOR, verdict(f1="MISSED", f2="MET"))
    assert direct_vm.run_validator() is False


def test_unreadable_evidence_three_times_makes_pool_refundable(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    contract = locked_pool(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.mock_web(SPEC_URL, {"status": 200, "body": ""})
    direct_vm.mock_llm(AUDITOR, json.dumps({"readable": False, "features": {}}))
    direct_vm.sender = direct_alice
    for expected in ("LOCKED", "LOCKED", "REFUNDABLE"):
        contract.assess(1)
        assert state(contract)["state"] == expected
    assert state(contract)["refund_pool"] == str(40 * GEN)


def test_stalled_pool_is_recoverable_after_timeout(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    contract = locked_pool(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.sender = direct_bob

    with direct_vm.expect_revert("RECOVERY_NOT_YET"):
        contract.recover(1)

    direct_vm.warp("2026-10-27T10:00:00Z")  # exactly 7 days after locking
    contract.recover(1)
    g = state(contract)
    assert g["state"] == "REFUNDABLE"
    assert g["refund_pool"] == str(40 * GEN) and g["creator_due"] == "0"

    contract.claim_refund(1)  # bob recovers his stake
    with direct_vm.expect_revert("ALREADY_CLAIMED"):
        contract.claim_refund(1)
