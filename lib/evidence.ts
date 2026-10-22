"use client";
import {EXPLORER} from "./network";

export type Evidence = {at: number; action: string; guarantee: string; hash: string};
const KEY = "specproof:evidence:v1";

export function readEvidence(): Evidence[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Evidence[]) : [];
  } catch {
    return [];
  }
}

export function addEvidence(e: Evidence) {
  try {
    const all = readEvidence();
    if (all.some((x) => x.hash === e.hash)) return;
    window.localStorage.setItem(KEY, JSON.stringify([...all, e]));
  } catch {
    /* storage unavailable: evidence can still be taken from the wallet history */
  }
}

export function clearEvidence() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;

export function evidenceText(list: Evidence[]) {
  return list
    .map((e, i) => `${i + 1}. ${e.action}${e.guarantee ? ` (guarantee #${e.guarantee})` : ""} - ${new Date(e.at).toISOString()} - ${txUrl(e.hash)}`)
    .join("\n");
}
