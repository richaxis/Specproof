"use client";
import {useEffect, useState} from "react";
import {clearEvidence, evidenceText, readEvidence, txUrl, type Evidence} from "@/lib/evidence";
import {shortAddr} from "@/lib/chain";
import {CONTRACT, hasContract} from "@/lib/network";

const LABEL: Record<string, string> = {
  create_guarantee: "Create guarantee",
  back: "Back",
  withdraw: "Withdraw",
  lock: "Lock",
  cancel: "Cancel",
  assess: "GenLayer assessment",
  recover: "Recover locked funds",
  claim_refund: "Backer refund",
  claim_proceeds: "Creator payout",
};

export default function EvidencePage() {
  const [list, setList] = useState<Evidence[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setList(readEvidence());
  }, []);

  const copy = () => {
    const head = `SpecProof live evidence${hasContract ? ` - contract ${CONTRACT}` : ""}\n`;
    navigator.clipboard?.writeText(head + evidenceText(list)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="page wrap">
      <div className="page-head">
        <div>
          <span className="eyebrow lime">Evidence</span>
          <h1 style={{marginTop: 12}}>Transaction <em>log</em></h1>
        </div>
        <div className="row">
          <button className="btn primary small" onClick={copy} disabled={list.length === 0}>{copied ? "Copied" : "Copy as text"}</button>
          <button className="btn small" onClick={() => { clearEvidence(); setList([]); }} disabled={list.length === 0}>Clear</button>
        </div>
      </div>
      <p className="lead" style={{marginBottom: 24}}>
        Every action you send from this browser is recorded here with its explorer link. Run the full path once (create, back, lock, assess,
        claim), then press <b>Copy as text</b> and paste it into your submission.
      </p>
      {hasContract && <div className="notice ok">Contract: <span className="mono">{shortAddr(CONTRACT)}</span> ({CONTRACT})</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Action</th><th>Guarantee</th><th>Transaction</th></tr></thead>
          <tbody>
            {list.map((e, i) => (
              <tr key={e.hash}>
                <td className="num">{i + 1}</td>
                <td>{LABEL[e.action] || e.action}</td>
                <td>{e.guarantee ? `#${e.guarantee}` : "new"}</td>
                <td><a href={txUrl(e.hash)} target="_blank" rel="noreferrer" className="mono" style={{fontSize: 13}}>{e.hash.slice(0, 12)}…{e.hash.slice(-6)} ↗</a></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={4} style={{color: "var(--muted)"}}>No transactions yet in this browser.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
