import * as genlayerChains from "genlayer-js/chains";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 61997);
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://studio-next.genlayer.com/api";
export const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer-studio-dev.genlayer.com";
export const CONTRACT = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "").trim();
export const hasContract = /^0x[0-9a-fA-F]{40}$/.test(CONTRACT);

/**
 * genlayer-js needs a GenLayer chain object (consensus contracts, default validator
 * counts, ...). A plain viem chain lacks those fields and makes writes fail with
 * "Cannot convert undefined to a BigInt". So we start from the library's own chain
 * (the Studio-dev / Studio-next chain if this version ships one, otherwise Studionet) and only
 * override the network details.
 */
const registry = genlayerChains as unknown as Record<string, Record<string, unknown>>;
const nextKey = Object.keys(registry).find((k) => /next|dev/i.test(k));
const base: Record<string, unknown> = (nextKey ? registry[nextKey] : registry.studionet) || {};

export const chain = {
  ...base,
  id: CHAIN_ID,
  name: "GenLayer Studio Next",
  nativeCurrency: {name: "GEN", symbol: "GEN", decimals: 18},
  rpcUrls: {default: {http: [RPC_URL]}},
  blockExplorers: {default: {name: "GenLayer Explorer", url: EXPLORER}},
  defaultNumberOfInitialValidators: base.defaultNumberOfInitialValidators ?? 5,
  defaultConsensusMaxRotations: base.defaultConsensusMaxRotations ?? 3,
};
