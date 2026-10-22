import Link from "next/link";
import CopyAddress from "@/components/CopyAddress";
import {FlowDiagram} from "@/components/Visuals";
import {LiveStats, LiveTiles, VaultPanel} from "@/components/HomeLive";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="badge"><span className="dot" /> <b>Live</b> on GenLayer Studio Next</span>
            <h1 className="reveal">Ship what you <em>promised.</em></h1>
            <p className="lead">
              Backers lock GEN against a sealed list of promised features. When the product ships, GenLayer validators read the public spec and rate every
              promise. Code pays the creator for what arrived and refunds the rest.
            </p>
            <div className="cta-row">
              <Link href="/dashboard" className="btn primary">Browse guarantees →</Link>
              <Link href="/#how" className="btn">How it works</Link>
            </div>
            <div className="chips">
              <span className="chip">Promise sealed on-chain</span>
              <span className="chip">Validator consensus verdict</span>
              <span className="chip">Pro-rata refunds</span>
              <span className="chip">Fail-closed on bad data</span>
            </div>
            <CopyAddress />
            <div className="scroll-cue eyebrow">Scroll</div>
          </div>
          <VaultPanel />
        </div>
      </section>

      <section className="block" id="how">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow lime">The mechanism</span>
            <h2>One promise, <em>one verdict.</em></h2>
            <p className="lead">Fixed rules for money, judgement only where judgement is needed.</p>
          </div>
          <div className="cards3">
            <div className="card"><span className="n">01 · SEAL</span><h3>The creator&apos;s side</h3><p>A creator publishes weighted features, such as “20h battery” or “IP67”. They are frozen on-chain, so the goalposts cannot move later.</p></div>
            <div className="card"><span className="n">02 · JUDGE</span><h3>The validator side</h3><p>Anyone triggers the check. Each validator reads the delivery page and rates every feature MET, PARTIAL or MISSED. Consensus decides.</p></div>
            <div className="card"><span className="n">03 · SETTLE</span><h3>Both sides</h3><p>Weights times ratings give a delivered share. The creator claims that share and backers claim the rest, pro-rata to their stake.</p></div>
          </div>
          <FlowDiagram />
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow lime">Why GenLayer</span>
            <h2>Every promise lives <em>twice.</em></h2>
          </div>
          <div className="two">
            <div className="col"><span className="eyebrow">The promise</span><h3>Written in plain language</h3><p>“Up to 14 hours in testing” versus “20 hours per charge” is not something a regular smart contract can compare. It needs reading, context and judgement.</p></div>
            <div className="col"><span className="eyebrow">The proof</span><h3>Checked by independent validators</h3><p>Several validators fetch the page and rate it on their own. The contract only accepts a verdict they agree on, then does the arithmetic in plain code.</p></div>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow lime">Live guarantees</span>
            <h2>Backed, locked and <em>audited.</em></h2>
          </div>
          <LiveTiles />
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow lime">Ecosystem</span>
            <h2>The numbers, <em>on-chain.</em></h2>
          </div>
          <LiveStats />
        </div>
      </section>

      <section className="block" id="safety">
        <div className="wrap">
          <span className="eyebrow lime">Risk posture</span>
          <h2 className="risk-title" style={{marginTop: 18}}>Boring on <em>purpose.</em></h2>
          <div className="cards4">
            <div className="card"><span className="n">SEALED</span><h4>Frozen promises</h4><p>Features and weights cannot be edited after creation.</p></div>
            <div className="card"><span className="n">FAIL-CLOSED</span><h4>Unreadable page, no payout</h4><p>If the page cannot be read, the creator is not paid. After three failed attempts everyone is refunded in full.</p></div>
            <div className="card"><span className="n">NO SELF-DEALING</span><h4>Creator cannot back</h4><p>A creator cannot fund their own guarantee to inflate it.</p></div>
            <div className="card"><span className="n">PULL PAYMENTS</span><h4>Claim, never push</h4><p>Each wallet claims its own share once, so a failing recipient cannot block anyone else.</p></div>
          </div>
        </div>
      </section>
    </>
  );
}
