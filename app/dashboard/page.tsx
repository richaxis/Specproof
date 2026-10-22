"use client";
import Link from "next/link";
import {useState} from "react";
import {useGuarantees} from "@/lib/data";
import {gen, STATE_LABEL, type GState} from "@/lib/spec";
import {EscrowBars, StatusChip} from "@/components/Visuals";
import Tile from "@/components/Tile";

const FILTERS: ("ALL" | GState)[] = ["ALL", "OPEN", "LOCKED", "SETTLED", "REFUNDABLE", "CANCELLED"];

export default function Dashboard() {
  const {list, stats, loading, error, demo, reload} = useGuarantees();
  const [f, setF] = useState<"ALL" | GState>("ALL");
  const shown = list.filter((g) => f === "ALL" || g.state === f);
  const bars = list.map((g) => ({label: `#${g.id} ${g.title}`, value: Number(gen(g.pot, 0).replace(/,/g, "")), state: g.state}));

  return (
    <div className="page wrap">
      <div className="page-head">
        <div>
          <span className="eyebrow lime">Dashboard</span>
          <h1 style={{marginTop: 12}}>All <em>guarantees</em></h1>
        </div>
        <div className="row">
          <button className="btn small" onClick={reload} disabled={loading || demo}>{loading ? "Refreshing…" : "Refresh"}</button>
          <Link href="/create" className="btn primary small">New guarantee</Link>
        </div>
      </div>

      {demo && <div className="notice">Demo data. Set NEXT_PUBLIC_CONTRACT_ADDRESS to read your deployed contract.</div>}
      {error && <div className="notice err">{error}</div>}

      <div className="stats">
        <div className="stat"><div className="n">{stats.guarantees}</div><div className="eyebrow c">Guarantees</div></div>
        <div className="stat"><div className="n">{stats.by_state.OPEN}</div><div className="eyebrow c">Open for backing</div></div>
        <div className="stat"><div className="n">{stats.by_state.LOCKED}</div><div className="eyebrow c">Awaiting verdict</div></div>
        <div className="stat"><div className="n">{gen(stats.total_escrow, 0)}</div><div className="eyebrow c">GEN escrowed</div></div>
      </div>

      <div className="grid-eq" style={{marginTop: 18}}>
        <div className="panel">
          <div className="eyebrow">Escrow by guarantee (GEN)</div>
          <div style={{marginTop: 16}}>{bars.length ? <EscrowBars items={bars} /> : <p className="lead">Nothing yet.</p>}</div>
        </div>
        <div className="panel">
          <div className="eyebrow">Pipeline</div>
          <div style={{display: "grid", gap: 12, marginTop: 18}}>
            {(Object.keys(STATE_LABEL) as GState[]).map((s) => (
              <div key={s} style={{display: "grid", gridTemplateColumns: "150px 1fr 30px", gap: 12, alignItems: "center"}}>
                <StatusChip state={s} />
                <div className="bar"><i className="a" style={{width: `${stats.guarantees ? (stats.by_state[s] / stats.guarantees) * 100 : 0}%`, background: s === "REFUNDABLE" || s === "CANCELLED" ? "var(--coral)" : s === "LOCKED" ? "var(--amber)" : s === "SETTLED" ? "var(--violet)" : "var(--lime)"}} /></div>
                <span className="mono" style={{fontSize: 13, textAlign: "right"}}>{stats.by_state[s]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="filters" style={{marginTop: 36}}>
        {FILTERS.map((x) => (
          <button key={x} className={`filter ${f === x ? "on" : ""}`} onClick={() => setF(x)}>{x === "ALL" ? "All" : STATE_LABEL[x]}</button>
        ))}
      </div>
      <div className="tiles">{shown.map((s) => <Tile key={s.id} s={s} />)}</div>
      {!loading && shown.length === 0 && <p className="lead">No guarantees match this filter.</p>}
    </div>
  );
}
