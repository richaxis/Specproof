import {parseEther} from "viem";
import type {Guarantee, Summary} from "./spec";

const e = (n: string) => parseEther(n).toString();
const DEMO_CREATOR = "0x9a3c5b1e7d20f4a86c1b3d5e7f9012a4b6c8d0e2";

const LOCKED_AT = 1_792_000_000;
const base: Omit<Guarantee, "locked_at" | "recover_at">[] = [
  {
    id: 1, creator: DEMO_CREATOR, title: "Aurora Buds · ANC earbuds", promise_url: "https://example.com/aurora/promise", delivery_url: "https://example.com/aurora/shipped",
    features: [
      {id: "f1", text: "Battery lasts 20 hours per charge", weight: 4000},
      {id: "f2", text: "Active noise cancellation, 35 dB", weight: 3500},
      {id: "f3", text: "IP67 water resistance", weight: 1500},
      {id: "f4", text: "Multipoint Bluetooth 5.4", weight: 1000},
    ],
    state: "SETTLED", pot: e("1200"), backers: 48, attempts: 1,
    statuses: {f1: "PARTIAL", f2: "MET", f3: "MET", f4: "MISSED"}, delivered_bps: 7000,
    refund_pool: e("360"), creator_due: e("840"), creator_claimed: false,
  },
  {
    id: 2, creator: DEMO_CREATOR, title: "Pocket Plotter · desk pen plotter", promise_url: "https://example.com/plotter/promise", delivery_url: "https://example.com/plotter/shipped",
    features: [
      {id: "f1", text: "A4 drawing area", weight: 5000},
      {id: "f2", text: "Open-source firmware on day one", weight: 3000},
      {id: "f3", text: "Ships with 3 pen holders", weight: 2000},
    ],
    state: "LOCKED", pot: e("640"), backers: 31, attempts: 0,
    statuses: {}, delivered_bps: 0, refund_pool: "0", creator_due: "0", creator_claimed: false,
  },
  {
    id: 3, creator: DEMO_CREATOR, title: "Lumen Desk Lamp", promise_url: "https://example.com/lumen/promise", delivery_url: "https://example.com/lumen/shipped",
    features: [
      {id: "f1", text: "2700K to 6500K tunable white", weight: 6000},
      {id: "f2", text: "Wireless charging base, 15 W", weight: 4000},
    ],
    state: "OPEN", pot: e("215"), backers: 12, attempts: 0,
    statuses: {}, delivered_bps: 0, refund_pool: "0", creator_due: "0", creator_claimed: false,
  },
  {
    id: 4, creator: DEMO_CREATOR, title: "TrailMap Offline GPS watch", promise_url: "https://example.com/trailmap/promise", delivery_url: "https://example.com/trailmap/shipped",
    features: [
      {id: "f1", text: "14-day battery in smartwatch mode", weight: 5000},
      {id: "f2", text: "Offline topographic maps", weight: 5000},
    ],
    state: "SETTLED", pot: e("980"), backers: 66, attempts: 0,
    statuses: {f1: "MET", f2: "MET"}, delivered_bps: 10000,
    refund_pool: "0", creator_due: e("980"), creator_claimed: true,
  },
  {
    id: 5, creator: DEMO_CREATOR, title: "Kettle One · smart kettle", promise_url: "https://example.com/kettle/promise", delivery_url: "https://example.com/kettle/shipped",
    features: [
      {id: "f1", text: "Boils 1.7 L in under 3 minutes", weight: 7000},
      {id: "f2", text: "App-controlled temperature", weight: 3000},
    ],
    state: "REFUNDABLE", pot: e("310"), backers: 19, attempts: 3,
    statuses: {}, delivered_bps: 0, refund_pool: e("310"), creator_due: "0", creator_claimed: false,
  },
];

export const demoGuarantees: Guarantee[] = base.map((g) =>
  g.state === "OPEN" || g.state === "CANCELLED" ? {...g, locked_at: 0, recover_at: 0} : {...g, locked_at: LOCKED_AT, recover_at: LOCKED_AT + 7 * 24 * 3600},
);

export const demoSummaries: Summary[] = demoGuarantees.map((g) => ({
  id: g.id, title: g.title, creator: g.creator, state: g.state, pot: g.pot, backers: g.backers, delivered_bps: g.delivered_bps, features: g.features.length,
}));
