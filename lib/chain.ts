"use client";
import {createClient} from "genlayer-js";
import {chain, CONTRACT, hasContract} from "./network";

export type Encodable = null | boolean | number | bigint | string | Encodable[];
type Provider = {
  request: (input: {method: string; params?: unknown[]}) => Promise<unknown>;
  on?: (e: string, l: (...a: unknown[]) => void) => void;
  removeListener?: (e: string, l: (...a: unknown[]) => void) => void;
};
declare global {
  interface Window {
    ethereum?: Provider;
  }
}
type Receipt = {execution_result?: string; mode?: string; genvm_result?: {error_code?: string | null}};
type Tx = {
  statusName?: string;
  txExecutionResultName?: string;
  consensus_data?: {leader_receipt?: Receipt[]; validators?: Receipt[]};
};
type Write = {address: `0x${string}`; functionName: string; args: Encodable[]; value?: bigint};
type Fees = {distribution: unknown; feeValue: bigint};
type Runtime = {
  estimateTransactionFeesForWrite: (w: Write) => Promise<Fees>;
  waitForDecision?: (i: {hash: `0x${string}`; interval?: number; retries?: number}) => Promise<Tx>;
  readContract: (i: {address: `0x${string}`; functionName: string; args: Encodable[]; transactionHashVariant?: "latest-final"}) => Promise<Encodable>;
  writeContract: (i: Write & {fees: Fees}) => Promise<string | {txId: string}>;
  waitForTransactionReceipt: (i: {hash: `0x${string}`; status: "FINALIZED"; interval: number; retries: number}) => Promise<Tx>;
  getTransaction: (i: {hash: `0x${string}`}) => Promise<Tx>;
};

const chainHex = `0x${chain.id.toString(16)}`;
const errorCode = (e: unknown) => (typeof e === "object" && e !== null && "code" in e ? Number((e as {code: unknown}).code) : 0);

export const shortAddr = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export async function ensureNetwork() {
  if (!window.ethereum) throw new Error("A browser wallet (e.g. MetaMask) is required");
  const current = String(await window.ethereum.request({method: "eth_chainId"})).toLowerCase();
  if (current === chainHex.toLowerCase()) return;
  try {
    await window.ethereum.request({method: "wallet_switchEthereumChain", params: [{chainId: chainHex}]});
  } catch (e) {
    if (errorCode(e) !== 4902) throw new Error(`Switch your wallet to GenLayer Studio Next (chain ${chain.id})`);
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: chainHex,
        chainName: chain.name,
        nativeCurrency: chain.nativeCurrency,
        rpcUrls: [chain.rpcUrls.default.http[0]],
        blockExplorerUrls: [chain.blockExplorers?.default.url],
      }],
    });
  }
}

export async function connect() {
  if (!window.ethereum) throw new Error("Install a browser wallet such as MetaMask");
  const accounts = (await window.ethereum.request({method: "eth_requestAccounts"})) as string[];
  await ensureNetwork();
  return accounts[0] || "";
}

export async function currentAccount() {
  if (!window.ethereum) return "";
  const a = (await window.ethereum.request({method: "eth_accounts"})) as string[];
  return a[0] || "";
}

export function watchAccounts(listener: (a: string) => void) {
  if (!window.ethereum?.on) return () => {};
  const fn = (...x: unknown[]) => listener(((x[0] || []) as string[])[0] || "");
  window.ethereum.on("accountsChanged", fn);
  return () => window.ethereum?.removeListener?.("accountsChanged", fn);
}

export async function readJson<T>(method: string, args: Encodable[] = []): Promise<T> {
  if (!hasContract) throw new Error("No contract address configured");
  const c = createClient({chain: chain as never}) as unknown as Runtime;
  const raw = await c.readContract({address: CONTRACT as `0x${string}`, functionName: method, args, transactionHashVariant: "latest-final"});
  return JSON.parse(String(raw)) as T;
}

export type Stage = "ESTIMATE" | "SIGNATURE" | "CONSENSUS" | "READBACK";

export async function transact(account: string, method: string, args: Encodable[], value: bigint, onStage: (s: Stage, hash?: string) => void) {
  if (!window.ethereum || !hasContract || !account) throw new Error("Connect a wallet and configure the contract address first");
  await ensureNetwork();
  const c = createClient({chain: chain as never, provider: window.ethereum as never, account: account as `0x${string}`}) as unknown as Runtime;
  // Studio Next charges a fee deposit: every write must carry an estimated fee.
  onStage("ESTIMATE");
  const write: Write = {address: CONTRACT as `0x${string}`, functionName: method, args, value};
  let fees: Fees;
  try {
    fees = await c.estimateTransactionFeesForWrite(write);
  } catch (e) {
    throw new Error(`Could not estimate the network fee: ${e instanceof Error ? e.message : "unknown error"}`);
  }
  onStage("SIGNATURE");
  const raw = await c.writeContract({...write, fees: {distribution: fees.distribution, feeValue: fees.feeValue}});
  const hash = typeof raw === "string" ? raw : raw.txId;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error("Wallet returned an invalid transaction id");
  onStage("CONSENSUS", hash);
  if (typeof c.waitForDecision === "function") {
    await c.waitForDecision({hash: hash as `0x${string}`, interval: 2500, retries: 360});
  } else {
    await c.waitForTransactionReceipt({hash: hash as `0x${string}`, status: "FINALIZED", interval: 2500, retries: 360});
  }
  const tx = await c.getTransaction({hash: hash as `0x${string}`});
  const receipts = [...(tx.consensus_data?.leader_receipt || []), ...(tx.consensus_data?.validators || [])];
  const leader = receipts.find((r) => r.mode === "leader");
  const failed =
    !["FINALIZED", "ACCEPTED"].includes(String(tx.statusName || "").toUpperCase()) ||
    String(tx.txExecutionResultName || "").toUpperCase().includes("ERROR") ||
    (leader ? leader.execution_result !== "SUCCESS" || Boolean(leader.genvm_result?.error_code) : false);
  if (failed) throw new Error("The transaction finalized with an error (the contract rejected it). Check the explorer for the reason.");
  onStage("READBACK", hash);
  return hash;
}
