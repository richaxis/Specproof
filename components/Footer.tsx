import Link from "next/link";
import {CHAIN_ID, CONTRACT, EXPLORER, hasContract} from "@/lib/network";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="big">
              specproof<i>✓</i>
            </div>
            <p className="lead" style={{marginTop: 18}}>Promises, audited by consensus.</p>
            <p className="mono eyebrow" style={{marginTop: 18}}>
              GenLayer Studio Next · {CHAIN_ID}
            </p>
            {hasContract && (
              <p className="mono eyebrow" style={{marginTop: 8, overflowWrap: "anywhere"}}>
                {CONTRACT}
              </p>
            )}
          </div>
          <div>
            <h5>Protocol</h5>
            <ul>
              <li><Link href="/dashboard">Guarantees</Link></li>
              <li><Link href="/create">Create one</Link></li>
              <li><Link href="/evidence">Evidence log</Link></li>
              <li><Link href="/#how">How it works</Link></li>
            </ul>
          </div>
          <div>
            <h5>Resources</h5>
            <ul>
              <li><a href={EXPLORER} target="_blank" rel="noreferrer">Explorer ↗</a></li>
              <li><a href="https://docs.genlayer.com" target="_blank" rel="noreferrer">GenLayer docs ↗</a></li>
              <li><Link href="/#safety">Safety</Link></li>
            </ul>
          </div>
          <div>
            <h5>Network</h5>
            <ul>
              <li>Studio Next</li>
              <li>Chain {CHAIN_ID}</li>
              <li>Native token GEN</li>
            </ul>
          </div>
        </div>
        <p className="fine">
          SpecProof is a hackathon prototype running on a test network. It rates what a public delivery page says against a sealed promise; it does not
          establish legal obligations, product quality or warranty. Funds on Studio Next have no real-world value.
        </p>
      </div>
    </footer>
  );
}
