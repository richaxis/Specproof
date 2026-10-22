import type {FStatus, GState} from "@/lib/spec";
import {STATE_LABEL} from "@/lib/spec";

export const StatusChip = ({state}: {state: GState}) => <span className={`status ${state}`}>{STATE_LABEL[state]}</span>;
export const VerdictChip = ({status}: {status: FStatus | "PENDING"}) => <span className={`status ${status}`}>{status}</span>;

/** Ring gauge: delivered share in lime, refunded share in coral. */
export function Donut({delivered, size = 190, label}: {delivered: number; size?: number; label?: string}) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const d = Math.max(0, Math.min(10000, delivered)) / 10000;
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" role="img" aria-label={`${(d * 100).toFixed(0)} percent delivered`}>
      <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,107,74,0.85)" strokeWidth="16" />
      <circle
        cx="90" cy="90" r={r} fill="none" stroke="#c4f35a" strokeWidth="16" strokeLinecap="butt"
        strokeDasharray={`${c * d} ${c}`} transform="rotate(-90 90 90)"
      />
      <text x="90" y="92" textAnchor="middle" fill="#f1eee6" fontFamily="var(--serif)" fontSize="38">{(d * 100).toFixed(0)}%</text>
      <text x="90" y="114" textAnchor="middle" fill="#9b9a93" fontFamily="var(--mono)" fontSize="9" letterSpacing="1.5">{label || "DELIVERED"}</text>
    </svg>
  );
}

export function SplitBar({delivered}: {delivered: number}) {
  return (
    <>
      <div className="bar" aria-hidden>
        <i className="a" style={{width: `${delivered / 100}%`}} />
        <i className="b" style={{width: `${100 - delivered / 100}%`}} />
      </div>
      <div className="legend">
        <span style={{["--c" as string]: "#c4f35a"}}>To creator {(delivered / 100).toFixed(0)}%</span>
        <span style={{["--c" as string]: "#ff6b4a"}}>Refunded {(100 - delivered / 100).toFixed(0)}%</span>
      </div>
    </>
  );
}

/** Promise -> validators -> split, drawn as an animated flow. */
export function FlowDiagram() {
  const box = {fill: "#12151a", stroke: "rgba(255,255,255,0.18)", strokeWidth: 1.2};
  const mono = {fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 1.6, fill: "#9b9a93"} as const;
  const title = {fontFamily: "var(--serif)", fontSize: 24, fill: "#f1eee6"} as const;
  return (
    <div className="flow">
      <svg viewBox="0 0 1000 300" role="img" aria-label="Backers' escrow flows to a validator panel, which splits funds between creator and refunds">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c4f35a" /></marker>
          <marker id="arrc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ff6b4a" /></marker>
        </defs>
        <rect x="20" y="95" width="250" height="110" rx="18" {...box} />
        <text x="145" y="135" textAnchor="middle" {...mono}>BACKERS · ESCROW</text>
        <text x="145" y="173" textAnchor="middle" {...title}>Sealed promise</text>

        <rect x="375" y="70" width="250" height="160" rx="18" {...box} stroke="#c4f35a" />
        <text x="500" y="112" textAnchor="middle" {...mono}>VALIDATOR PANEL</text>
        <text x="500" y="152" textAnchor="middle" {...title}>Read the proof</text>
        <text x="500" y="186" textAnchor="middle" {...mono}>MET · PARTIAL · MISSED</text>

        <rect x="730" y="20" width="250" height="100" rx="18" {...box} />
        <text x="855" y="58" textAnchor="middle" {...mono}>DELIVERED SHARE</text>
        <text x="855" y="96" textAnchor="middle" {...title}>Creator</text>

        <rect x="730" y="180" width="250" height="100" rx="18" {...box} />
        <text x="855" y="218" textAnchor="middle" {...mono}>UNDELIVERED SHARE</text>
        <text x="855" y="256" textAnchor="middle" {...title}>Backer refunds</text>

        <path className="dash-anim" d="M272 150H372" stroke="#c4f35a" strokeWidth="2" fill="none" markerEnd="url(#arr)" />
        <path className="dash-anim" d="M627 125C680 125 680 70 727 70" stroke="#c4f35a" strokeWidth="2" fill="none" markerEnd="url(#arr)" />
        <path className="dash-anim" d="M627 175C680 175 680 230 727 230" stroke="#ff6b4a" strokeWidth="2" fill="none" markerEnd="url(#arrc)" />
        <text x="322" y="138" textAnchor="middle" {...mono}>LOCK</text>
        <text x="680" y="52" textAnchor="middle" {...mono}>PAY</text>
        <text x="680" y="252" textAnchor="middle" {...mono}>REFUND</text>
      </svg>
      <p className="eyebrow cap">One verdict, split by code</p>
    </div>
  );
}

/** Tiny stacked bars for escrow by guarantee, used on the dashboard. */
export function EscrowBars({items}: {items: {label: string; value: number; state: GState}[]}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const color = (s: GState) => (s === "OPEN" ? "#c4f35a" : s === "LOCKED" ? "#ffc247" : s === "SETTLED" ? "#8b7bff" : "#ff6b4a");
  const h = 34;
  return (
    <svg viewBox={`0 0 560 ${items.length * h + 8}`} width="100%" role="img" aria-label="Escrow by guarantee">
      {items.map((it, i) => (
        <g key={it.label} transform={`translate(0 ${i * h + 4})`}>
          <text x="0" y="17" fill="#9b9a93" fontFamily="var(--mono)" fontSize="11">{it.label.length > 26 ? it.label.slice(0, 25) + "…" : it.label}</text>
          <rect x="210" y="6" width="340" height="14" rx="7" fill="rgba(255,255,255,0.06)" />
          <rect x="150" y="6" width={Math.max(6, (it.value / max) * 340)} height="14" rx="7" fill={color(it.state)} />
        </g>
      ))}
    </svg>
  );
}
