import {formatEther} from "viem";

export type GState = "OPEN" | "LOCKED" | "SETTLED" | "REFUNDABLE" | "CANCELLED";
export type FStatus = "MET" | "PARTIAL" | "MISSED";

export type Feature = {id: string; text: string; weight: number};
export type Guarantee = {
  id: number;
  creator: string;
  title: string;
  promise_url: string;
  delivery_url: string;
  features: Feature[];
  state: GState;
  pot: string;
  backers: number;
  attempts: number;
  statuses: Record<string, FStatus>;
  locked_at: number;
  recover_at: number;
  delivered_bps: number;
  refund_pool: string;
  creator_due: string;
  creator_claimed: boolean;
};
export type Summary = {id: number; title: string; creator: string; state: GState; pot: string; backers: number; delivered_bps: number; features: number};
export type Stats = {guarantees: number; total_escrow: string; by_state: Record<GState, number>; version: string};

export const STATE_LABEL: Record<GState, string> = {
  OPEN: "Backing open",
  LOCKED: "Awaiting verdict",
  SETTLED: "Settled",
  REFUNDABLE: "Full refund",
  CANCELLED: "Cancelled",
};

export const gen = (wei: string | bigint, digits = 2) => {
  const n = Number(formatEther(typeof wei === "bigint" ? wei : BigInt(wei || "0")));
  return n.toLocaleString("en-US", {maximumFractionDigits: digits});
};
export const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;

export function summarise(list: Summary[]): Stats {
  const by: Record<GState, number> = {OPEN: 0, LOCKED: 0, SETTLED: 0, REFUNDABLE: 0, CANCELLED: 0};
  let total = 0n;
  for (const s of list) {
    by[s.state] += 1;
    total += BigInt(s.pot);
  }
  return {guarantees: list.length, total_escrow: total.toString(), by_state: by, version: "demo"};
}
