"use client";
import Link from "next/link";
import {useState} from "react";
import {useWallet} from "@/components/Providers";
import {useTx} from "@/lib/useTx";
import {hasContract} from "@/lib/network";

type Row = {text: string; pct: string};

export default function Create() {
  const {account, connect} = useWallet();
  const tx = useTx(account);
  const [title, setTitle] = useState("");
  const [promise, setPromise] = useState("");
  const [delivery, setDelivery] = useState("");
  const [rows, setRows] = useState<Row[]>([{text: "", pct: "50"}, {text: "", pct: "50"}]);

  const okUrl = (u: string) => /^https:\/\/\S{4,}$/.test(u);
  const total = rows.reduce((a, r) => a + (Number(r.pct) || 0), 0);
    const problems: string[] = [];
  if (title.trim().length < 3) problems.push("Enter a product name (at least 3 characters).");
  if (!okUrl(promise.trim())) problems.push("Promise page must be a full link starting with https://");
  if (!okUrl(delivery.trim())) problems.push("Delivery page must be a full link starting with https://");
  rows.forEach((r, i) => {
    if (r.text.trim().length < 3) problems.push(`Feature ${i + 1}: type the promised feature (at least 3 characters).`);
    if (!Number.isInteger(Number(r.pct)) || Number(r.pct) <= 0) problems.push(`Feature ${i + 1}: weight must be a whole number above 0 (remove the row if unused).`);
  });
  if (total !== 100) problems.push(`Weights add up to ${total}%, they must add up to exactly 100%.`);
  const valid = problems.length === 0;

  const update = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? {...r, ...patch} : r)));

  const submit = () => {
    const features = JSON.stringify(rows.map((r) => ({text: r.text.trim(), weight: Number(r.pct) * 100})));
    void tx.run("created", "create_guarantee", [title.trim(), promise.trim(), delivery.trim(), features]);
  };

  return (
    <div className="page wrap">
      <div className="page-head">
        <div>
          <span className="eyebrow lime">Creator</span>
          <h1 style={{marginTop: 12}}>Seal a <em>promise</em></h1>
        </div>
      </div>
      {!hasContract && <div className="notice">Demo mode: the form works, but sending needs a deployed contract address.</div>}
      <div className="grid2">
        <div className="panel form">
          <label className="f">Product name
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Aurora Buds · ANC earbuds" maxLength={80} />
          </label>
          <label className="f">Promise page (public URL where the promise was made)
            <input value={promise} onChange={(e) => setPromise(e.target.value)} placeholder="https://yourproject.com/campaign" />
          </label>
          <label className="f">Delivery page (public URL validators will read: final spec sheet or release notes)
            <input value={delivery} onChange={(e) => setDelivery(e.target.value)} placeholder="https://yourproject.com/specs" />
          </label>

          <div>
            <div className="eyebrow" style={{marginBottom: 10}}>Promised features and their weight</div>
            <div className="form">
              {rows.map((r, i) => (
                <div className="feat-row" key={i}>
                  <label className="f">Feature {i + 1}
                    <input value={r.text} onChange={(e) => update(i, {text: e.target.value})} placeholder="Battery lasts 20 hours" maxLength={240} />
                  </label>
                  <label className="f">Weight %
                    <input value={r.pct} inputMode="numeric" onChange={(e) => update(i, {pct: e.target.value.replace(/\D/g, "")})} />
                  </label>
                  <button className="icon-btn" aria-label="Remove feature" disabled={rows.length <= 1} onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>
                </div>
              ))}
            </div>
            <div className="row" style={{marginTop: 14, justifyContent: "space-between"}}>
              <button className="btn small" disabled={rows.length >= 6} onClick={() => setRows([...rows, {text: "", pct: "0"}])}>+ Add feature</button>
              <span className={`sum ${total === 100 ? "good" : "bad"}`}>Total {total}% {total === 100 ? "✓" : "(must be 100)"}</span>
            </div>
          </div>

          {tx.error && <div className="notice err">{tx.error}</div>}
          {tx.done && (
            <div className="notice ok">
              Guarantee created. <Link href="/dashboard" style={{textDecoration: "underline"}}>Open the dashboard</Link> to find it, then share it with backers.
            </div>
          )}
          {tx.busy && <div className="notice"><span className="spin" /> {tx.stage === "ESTIMATE" ? "Estimating the network fee…" : tx.stage === "SIGNATURE" ? "Confirm in your wallet (value plus network fee)…" : "Waiting for validator consensus (can take a minute)…"}</div>}

          {!valid && (
            <div className="notice">
              <b>Still to fix before you can create:</b>
              <ul style={{margin: "8px 0 0", paddingLeft: 18}}>{problems.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
          )}
          {account ? (
            <button className="btn primary" disabled={!valid || tx.busy} onClick={submit}>Seal and create</button>
          ) : (
            <button className="btn primary" onClick={connect}>Connect wallet first</button>
          )}
        </div>

        <div className="panel">
          <div className="eyebrow">Tips for a clean verdict</div>
          <div style={{display: "grid", gap: 14, marginTop: 16, color: "var(--muted)", fontSize: 15}}>
            <p>Write features that a stranger can check on a page: numbers, named parts, clear yes/no claims.</p>
            <p>Make sure the delivery page is public, loads without logging in, and states the real specs in plain text.</p>
            <p>Weights decide how much each feature moves the money. They must add up to 100%.</p>
            <p>Absence counts as MISSED. If the page doesn&apos;t mention a feature, validators cannot confirm it.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
