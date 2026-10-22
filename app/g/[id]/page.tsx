"use client";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useCallback, useEffect, useState} from "react";
import {parseEther} from "viem";
import {shortAddr} from "@/lib/chain";
import {readStake, useGuarantee} from "@/lib/data";
import {EXPLORER} from "@/lib/network";
import {gen, pct, type GState} from "@/lib/spec";
import {useTx} from "@/lib/useTx";
import {useWallet} from "@/components/Providers";
import {Donut, SplitBar, StatusChip, VerdictChip} from "@/components/Visuals";

const fmtDate = (sec: number) => new Date(sec * 1000).toLocaleString();

const FLOW: {key: string; label: string; states: GState[]}[] = [
  {key: "open", label: "Backing", states: ["OPEN"]},
  {key: "locked", label: "Locked", states: ["LOCKED"]},
  {key: "verdict", label: "Verdict", states: ["SETTLED", "REFUNDABLE"]},
];

export default function GuaranteePage() {
  const {id} = useParams<{id: string}>();
  const gid = Number(id);
  const {account, connect} = useWallet();
  const {g, loading, error, demo, reload} = useGuarantee(gid);
  const [stake, setStake] = useState({stake: "0", claimed: false});
  const [amount, setAmount] = useState("10");
  const [copied, setCopied] = useState(false);
  const [nowSec, setNowSec] = useState(0);
  useEffect(() => {
    setNowSec(Math.floor(Date.now() / 1000));
    const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 30000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(() => {
    void reload();
    readStake(gid, account).then(setStake).catch(() => {});
  }, [reload, gid, account]);
  const tx = useTx(account, refresh);

  useEffect(() => {
    let alive = true;
    readStake(gid, account).then((s) => alive && setStake(s)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [gid, account]);

  if (loading && !g) return <div className="page wrap"><p className="lead"><span className="spin" /> Reading the contract…</p></div>;
  if (!g) {
    return (
      <div className="page wrap">
        <p className="lead">{error || "Guarantee not found."}</p>
        <p style={{marginTop: 18}}><Link className="btn" href="/dashboard">← Back to dashboard</Link></p>
      </div>
    );
  }

  const me = account.toLowerCase();
  const isCreator = me !== "" && me === g.creator.toLowerCase();
  const myStake = BigInt(stake.stake);
  const reached = g.state === "OPEN" ? 0 : g.state === "LOCKED" ? 1 : g.state === "CANCELLED" ? 0 : 2;
  const amountWei = (() => {
    try {
      return parseEther(amount || "0");
    } catch {
      return 0n;
    }
  })();
  const myRefund = BigInt(g.pot) > 0n ? (BigInt(g.refund_pool) * myStake) / BigInt(g.pot) : 0n;
  const canRecover = g.state === "LOCKED" && g.recover_at > 0 && nowSec >= g.recover_at;
  const stateText = () =>
    [`SpecProof guarantee #${g.id} - ${g.title}`, `State: ${g.state}`, `Escrow: ${gen(g.pot, 4)} GEN from ${g.backers} backers`,
      `Verdict: ${g.features.map((f) => `${f.text} = ${g.statuses[f.id] || "-"}`).join("; ")}`,
      `Delivered share: ${pct(g.delivered_bps)}`, `To creator: ${gen(g.creator_due, 4)} GEN (claimed: ${g.creator_claimed})`, `Refund pool: ${gen(g.refund_pool, 4)} GEN`].join("\n");
  const closed = g.state === "SETTLED" || g.state === "REFUNDABLE" || g.state === "CANCELLED";

  return (
    <div className="page wrap">
      <div className="page-head">
        <div>
          <span className="eyebrow lime">Guarantee #{String(g.id).padStart(2, "0")}</span>
          <h1 style={{marginTop: 12}}>{g.title}</h1>
        </div>
        <StatusChip state={g.state} />
      </div>
      {demo && <div className="notice">Demo data. Deploy the contract and set NEXT_PUBLIC_CONTRACT_ADDRESS to act on real guarantees.</div>}

      <div className="steps">
        {FLOW.map((s, i) => (
          <div key={s.key} className={`step ${i < reached ? "done" : i === reached ? (g.state === "LOCKED" ? "now" : "done") : ""}`}>{i + 1} · {s.label}</div>
        ))}
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="eyebrow">Sealed promise vs. verdict</div>
          <div className="spec">
            {g.features.map((f) => (
              <div className="spec-row" key={f.id}>
                <div className="tx">{f.text}</div>
                <div className="w">weight {pct(f.weight)}</div>
                <div><VerdictChip status={g.statuses[f.id] || "PENDING"} /></div>
              </div>
            ))}
          </div>
          {g.state === "LOCKED" && g.attempts > 0 && (
            <div className="notice" style={{marginTop: 18}}>The delivery page could not be read {g.attempts} time(s). After 3 failed attempts all backers are refunded in full.</div>
          )}
          <dl className="kv" style={{marginTop: 24}}>
            <dt>Creator</dt><dd>{shortAddr(g.creator)}</dd>
            <dt>Promise page</dt><dd><a href={g.promise_url} target="_blank" rel="noreferrer">{g.promise_url} ↗</a></dd>
            <dt>Delivery page</dt><dd><a href={g.delivery_url} target="_blank" rel="noreferrer">{g.delivery_url} ↗</a></dd>
            <dt>Escrow</dt><dd>{gen(g.pot)} GEN · {g.backers} backers</dd>
          </dl>
        </div>

        <div style={{display: "grid", gap: 18}}>
          <div className="panel glow">
            <div className="eyebrow">{g.state === "SETTLED" ? "Verdict" : "Outcome preview"}</div>
            <div className="donut-wrap">
              <Donut delivered={g.state === "SETTLED" ? g.delivered_bps : g.state === "REFUNDABLE" || g.state === "CANCELLED" ? 0 : 10000} label={g.state === "SETTLED" ? "DELIVERED" : g.state === "OPEN" || g.state === "LOCKED" ? "IF ALL MET" : "DELIVERED"} />
            </div>
            {g.state === "SETTLED" && <SplitBar delivered={g.delivered_bps} />}
            {closed && (
              <dl className="kv" style={{marginTop: 18}}>
                <dt>To creator</dt><dd>{gen(g.creator_due)} GEN</dd>
                <dt>Refund pool</dt><dd>{gen(g.refund_pool)} GEN</dd>
                {myStake > 0n && <><dt>Your refund</dt><dd>{gen(myRefund, 4)} GEN</dd></>}
              </dl>
            )}
          </div>

          <div className="panel">
            <div className="eyebrow">Actions</div>
            {tx.error && <div className="notice err" style={{marginTop: 14}}>{tx.error}</div>}
            {tx.done && <div className="notice ok" style={{marginTop: 14}}>Done. {tx.hash && <a href={`${EXPLORER}/transactions/${tx.hash}`} target="_blank" rel="noreferrer" style={{textDecoration: "underline"}}>View transaction ↗</a>}</div>}
            {tx.busy && <div className="notice" style={{marginTop: 14}}><span className="spin" /> {tx.stage === "ESTIMATE" ? "Estimating the network fee…" : tx.stage === "SIGNATURE" ? "Confirm in your wallet (value plus network fee)…" : "Waiting for validator consensus… the verdict can take a minute or two."}</div>}

            <div className="actions">
              {!account && <button className="btn primary" onClick={connect}>Connect wallet</button>}

              {account && g.state === "OPEN" && !isCreator && (
                <>
                  <label className="f">Back with (GEN)
                    <input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} />
                  </label>
                  <button className="btn primary" disabled={tx.busy || amountWei === 0n} onClick={() => void tx.run("backed", "back", [BigInt(g.id)], amountWei)}>Back this guarantee</button>
                  {myStake > 0n && (
                    <button className="btn" disabled={tx.busy} onClick={() => void tx.run("withdrawn", "withdraw", [BigInt(g.id)])}>Withdraw my {gen(myStake)} GEN</button>
                  )}
                </>
              )}
              {account && g.state === "OPEN" && isCreator && (
                <>
                  <button className="btn primary" disabled={tx.busy || BigInt(g.pot) === 0n} onClick={() => void tx.run("locked", "lock", [BigInt(g.id)])}>Close backing and lock</button>
                  <button className="btn danger" disabled={tx.busy} onClick={() => void tx.run("cancelled", "cancel", [BigInt(g.id)])}>Cancel and refund everyone</button>
                </>
              )}
              {g.state === "LOCKED" && g.recover_at > 0 && (
                <p className="eyebrow">{canRecover ? "Recovery is open: if no verdict is possible, anyone can refund all backers in full." : `If no verdict is reached, anyone can refund all backers in full after ${fmtDate(g.recover_at)}.`}</p>
              )}
              {account && canRecover && (
                <button className="btn danger" disabled={tx.busy} onClick={() => void tx.run("recovered", "recover", [BigInt(g.id)])}>Recover locked funds (full refund)</button>
              )}
              {account && g.state === "LOCKED" && (
                <>
                  <button className="btn primary" disabled={tx.busy} onClick={() => void tx.run("assessed", "assess", [BigInt(g.id)])}>Ask validators for a verdict</button>
                  <p className="eyebrow">Anyone can trigger this once the pool is locked.</p>
                </>
              )}
              {account && closed && myStake > 0n && !stake.claimed && BigInt(g.refund_pool) > 0n && (
                <button className="btn primary" disabled={tx.busy} onClick={() => void tx.run("refunded", "claim_refund", [BigInt(g.id)])}>Claim my refund ({gen(myRefund, 4)} GEN)</button>
              )}
              {account && isCreator && g.state === "SETTLED" && !g.creator_claimed && BigInt(g.creator_due) > 0n && (
                <button className="btn primary" disabled={tx.busy} onClick={() => void tx.run("paid", "claim_proceeds", [BigInt(g.id)])}>Claim proceeds ({gen(g.creator_due)} GEN)</button>
              )}
              <button className="btn small" onClick={() => { navigator.clipboard?.writeText(stateText()).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy state as text"}</button>
              {account && closed && stake.claimed && <p className="eyebrow">Your refund is already claimed.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
