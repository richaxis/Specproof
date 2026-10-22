"use client";
import {useCallback, useState} from "react";
import {transact, type Encodable, type Stage} from "./chain";
import {hasContract} from "./network";
import {addEvidence} from "./evidence";

export type TxState = {busy: boolean; stage: Stage | ""; hash: string; error: string; done: string};

export function useTx(account: string, onDone?: () => void) {
  const [s, setS] = useState<TxState>({busy: false, stage: "", hash: "", error: "", done: ""});

  const run = useCallback(
    async (label: string, method: string, args: Encodable[], value: bigint = 0n) => {
      if (!hasContract) {
        setS({busy: false, stage: "", hash: "", done: "", error: "Demo mode: deploy the contract and set NEXT_PUBLIC_CONTRACT_ADDRESS to send real transactions."});
        return;
      }
      setS({busy: true, stage: "SIGNATURE", hash: "", error: "", done: ""});
      try {
        const hash = await transact(account, method, args, value, (stage, h) => setS((p) => ({...p, stage, hash: h || p.hash})));
        addEvidence({at: Date.now(), action: method, guarantee: method !== "create_guarantee" && typeof args[0] === "bigint" ? String(args[0]) : "", hash});
        setS({busy: false, stage: "", hash, error: "", done: label});
        onDone?.();
      } catch (e) {
        setS((p) => ({...p, busy: false, stage: "", error: e instanceof Error ? e.message : "Transaction failed"}));
      }
    },
    [account, onDone],
  );
  return {...s, run};
}
