"use client";
import Link from "next/link";
import {useGuarantees} from "@/lib/data";
import {gen} from "@/lib/spec";
import {StatusChip} from "./Visuals";
import Tile from "./Tile";

/** Hero panel: live escrow reading, like a vault ticker. */
export function VaultPanel() {
  const {stats, list, loading, demo} = useGuarantees();
  const locked = list.filter((g) => g.state === "LOCKED" || g.state === "OPEN").slice(0, 3);
  return (
    <div className="panel glow reveal">
      <div className="eyebrow">In escrow · awaiting delivery</div>
      <div className="vault-num">
        {loading ? "Reading the chain…" : gen(stats.total_escrow, 0)}
        {!loading && <small>GEN</small>}
      </div>
      <div className="eyebrow">{demo ? "Demo data" : "Live from the contract"}</div>
      <div className="mini-list">
        {locked.map((g) => (
          <Link key={g.id} href={`/g/${g.id}`} className="mini">
            <span className="t">{g.title}</span>
            <span className="v">{gen(g.pot, 0)} GEN</span>
          </Link>
        ))}
        {!loading && locked.length === 0 && <div className="mini"><span className="t">No active guarantees yet</span><span className="v">—</span></div>}
      </div>
    </div>
  );
}

export function LiveTiles() {
  const {list} = useGuarantees();
  return (
    <>
      <div className="tiles">
        {list.slice(0, 8).map((s) => (
          <Tile key={s.id} s={s} />
        ))}
      </div>
      {list.length === 0 && <p className="lead">No guarantees yet. <Link href="/create" style={{color: "var(--lime)"}}>Create the first one →</Link></p>}
    </>
  );
}

export function LiveStats() {
  const {stats, list} = useGuarantees();
  const settled = list.filter((g) => g.state === "SETTLED");
  const avg = settled.length ? settled.reduce((a, g) => a + g.delivered_bps, 0) / settled.length : 0;
  const backers = list.reduce((a, g) => a + g.backers, 0);
  return (
    <>
      <div className="stats">
        <div className="stat"><div className="n">{stats.guarantees}</div><div className="eyebrow c">Guarantees</div></div>
        <div className="stat"><div className="n">{gen(stats.total_escrow, 0)}</div><div className="eyebrow c">GEN escrowed, all time</div></div>
        <div className="stat"><div className="n">{backers}</div><div className="eyebrow c">Backers</div></div>
        <div className="stat"><div className="n">{(avg / 100).toFixed(0)}%</div><div className="eyebrow c">Avg. promise delivered</div></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Guarantee</th><th className="num">Escrow (GEN)</th><th className="num">Backers</th><th>Status</th></tr></thead>
          <tbody>
            {list.map((g) => (
              <tr key={g.id}>
                <td><Link href={`/g/${g.id}`}>#{String(g.id).padStart(2, "0")} · {g.title}</Link></td>
                <td className="num">{gen(g.pot, 0)}</td>
                <td className="num">{g.backers}</td>
                <td><StatusChip state={g.state} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
