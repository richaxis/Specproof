import Link from "next/link";
import {gen, type Summary} from "@/lib/spec";
import {SplitBar, StatusChip} from "./Visuals";

export default function Tile({s}: {s: Summary}) {
  return (
    <Link href={`/g/${s.id}`} className="tile">
      <div className="top">
        <span className="tk">#{String(s.id).padStart(2, "0")}</span>
        <StatusChip state={s.state} />
      </div>
      <div className="nm">{s.title}</div>
      <div className="pot">
        {gen(s.pot, 0)}
        <small>GEN · {s.backers} backers</small>
      </div>
      {s.state === "SETTLED" ? <SplitBar delivered={s.delivered_bps} /> : <div className="eyebrow">{s.features} promised features</div>}
    </Link>
  );
}
