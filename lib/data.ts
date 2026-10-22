"use client";
import {useCallback, useEffect, useState} from "react";
import {readJson} from "./chain";
import {hasContract} from "./network";
import {demoGuarantees, demoSummaries} from "./demo";
import {summarise, type Guarantee, type Stats, type Summary} from "./spec";

export function useGuarantees() {
  const [list, setList] = useState<Summary[]>(hasContract ? [] : demoSummaries);
  const [loading, setLoading] = useState(hasContract);
  const [error, setError] = useState("");
  const demo = !hasContract;

  const reload = useCallback(async () => {
    if (!hasContract) return;
    setLoading(true);
    setError("");
    try {
      setList(await readJson<Summary[]>("list_guarantees"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the contract");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const stats: Stats = summarise(list);
  return {list, stats, loading, error, demo, reload};
}

export function useGuarantee(id: number) {
  const [g, setG] = useState<Guarantee | null>(hasContract ? null : demoGuarantees.find((x) => x.id === id) || null);
  const [loading, setLoading] = useState(hasContract);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!hasContract) return;
    setLoading(true);
    setError("");
    try {
      setG(await readJson<Guarantee>("get_guarantee", [BigInt(id)]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the contract");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  return {g, loading, error, demo: !hasContract, reload};
}

export async function readStake(id: number, account: string) {
  if (!hasContract || !account) return {stake: "0", claimed: false};
  return readJson<{stake: string; claimed: boolean}>("get_stake", [BigInt(id), account]);
}
