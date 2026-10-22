"use client";
import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {connect as walletConnect, currentAccount, watchAccounts} from "@/lib/chain";

type Wallet = {account: string; connecting: boolean; error: string; connect: () => Promise<void>};
const Ctx = createContext<Wallet>({account: "", connecting: false, error: "", connect: async () => {}});
export const useWallet = () => useContext(Ctx);

export default function Providers({children}: {children: React.ReactNode}) {
  const [account, setAccount] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    currentAccount().then((a) => alive && setAccount(a)).catch(() => {});
    const stop = watchAccounts((a) => setAccount(a));
    return () => {
      alive = false;
      stop();
    };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError("");
    try {
      setAccount(await walletConnect());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect");
    } finally {
      setConnecting(false);
    }
  }, []);

  const value = useMemo(() => ({account, connecting, error, connect}), [account, connecting, error, connect]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
