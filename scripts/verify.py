#!/usr/bin/env python3
"""Local checks: contract header, forbidden patterns, and the unit tests."""
import pathlib
import subprocess
import sys

root = pathlib.Path(__file__).resolve().parents[1]
src = (root / "contracts" / "spec_proof.py").read_text().splitlines()

errors = []
if src[0].strip() != "# v0.3.0":
    errors.append("line 1 must be '# v0.3.0'")
if '"Depends": "py-genlayer:' not in src[1] or "latest" in src[1]:
    errors.append("line 2 must pin py-genlayer by hash (never :latest)")
if sum(1 for l in src if l.startswith("class ") and "gl.contract.Contract" in l) != 1:
    errors.append("exactly one class must extend gl.contract.Contract")
for bad in ("import random", "time.time", "datetime.now", "datetime.datetime.now", "datetime.utcnow"):
    if bad in "\n".join(src):
        errors.append(f"non-deterministic construct found: {bad}")
if errors:
    print("FAIL:\n - " + "\n - ".join(errors))
    sys.exit(1)
print("contract header and structure OK")
sys.exit(subprocess.call([sys.executable, "-I", "-m", "unittest", "discover", "-s", str(root / "tests" / "unit")]))
