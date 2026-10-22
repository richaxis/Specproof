"""Minimal in-memory stand-in for the `genlayer` module so the contract's
deterministic logic can be unit-tested without a node. LLM and web calls are
scripted by the tests; consensus is simulated as 'leader result wins'."""
import sys
import types


class UserError(Exception):
    pass


class Address:
    def __init__(self, value):
        self.as_hex = str(value).lower()


class TreeMap(dict):
    def __class_getitem__(cls, item):
        return cls


class Message:
    sender_address = Address("0x" + "a" * 40)
    value = 0


transfers = []
llm = {"page": "", "answer": "", "calls": 0, "fail": False}
clock = {"now": "2026-10-20T10:00:00Z"}


def contract_interface(cls):
    class Wallet:
        def __init__(self, address):
            self.address = address.as_hex

        def emit_transfer(self, value):
            transfers.append((self.address, int(value)))

    return Wallet


class Contract:
    def __new__(cls, *args, **kwargs):
        obj = super().__new__(cls)
        for name, hint in getattr(cls, "__annotations__", {}).items():
            if hint is TreeMap:
                setattr(obj, name, TreeMap())
            else:
                setattr(obj, name, 0)
        return obj


class _Deco:
    def __call__(self, fn):
        return fn


class _Write(_Deco):
    payable = _Deco()


def _render(url, mode="text"):
    if llm["fail"]:
        raise RuntimeError("web fetch failed")
    return llm["page"]


def _exec_prompt(task):
    llm["calls"] += 1
    llm["task"] = task
    return llm["answer"]


def install():
    gl = types.ModuleType("genlayer")
    gl.contract = types.SimpleNamespace(Contract=Contract)
    gl.public = types.SimpleNamespace(view=_Deco(), write=_Write())
    gl.message = Message

    class RawMessage(dict):
        def __getitem__(self, key):
            if clock["now"] is None:
                raise KeyError(key)
            return clock["now"]

    gl.message_raw = RawMessage()
    gl.vm = types.SimpleNamespace(UserError=UserError)
    gl.storage = types.SimpleNamespace(TreeMap=TreeMap)
    gl.evm = types.SimpleNamespace(contract_interface=contract_interface)
    gl.nondet = types.SimpleNamespace(
        web=types.SimpleNamespace(render=_render), exec_prompt=_exec_prompt
    )
    gl.eq_principle = types.SimpleNamespace(
        prompt_comparative=lambda fn, criteria: fn(),
        strict_eq=lambda fn: fn(),
    )
    types_mod = types.ModuleType("genlayer.types")
    types_mod.u256 = int
    types_mod.Address = Address
    types_mod.__all__ = ["u256", "Address"]
    gl.types = types_mod
    sys.modules["genlayer"] = gl
    sys.modules["genlayer.types"] = types_mod
    return gl
