"use client";

import { useState, useEffect } from "react";
import DexCard from "./DexCard";
import TokenModal from "./TokenModal";

const STORAGE_KEY = "solana_watchlist";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setWatchlist(JSON.parse(stored));
    } catch {}
  }, []);

  const add = (token: any) => {
    setWatchlist(prev => {
      if (prev.find(t => t.address === token.address)) return prev;
      const next = [...prev, token];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const remove = (address: string) => {
    setWatchlist(prev => {
      const next = prev.filter(t => t.address !== address);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const has = (address: string) => watchlist.some(t => t.address === address);

  return { watchlist, add, remove, has };
}

export default function WatchlistTab({ onSelect, dark = false, liveTokens = [] }: { onSelect: (t: any) => void; dark?: boolean; liveTokens?: any[] }) {
  const { watchlist, remove } = useWatchlist();
  const bg2   = dark ? "#2a2a28" : "#F1EFE8";
  const text  = dark ? "#e8e6df" : "#2c2c2a";
  const text2 = dark ? "#9c9a92" : "#888780";
  const text3 = dark ? "#6a6a68" : "#B4B2A9";
  const border= dark ? "#3a3a38" : "#D3D1C7";
  const green = dark ? "#7bc96f" : "#3B6D11";

  // Merge live prices into watchlist
  const displayTokens = watchlist.map((t: any) => {
    const live = liveTokens.find((l: any) => l.address === t.address);
    return live || t;
  });

  if (watchlist.length === 0) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "#888780", fontSize: 14 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>☆</div>
      <div style={{ fontWeight: 500, marginBottom: 6 }}>No tokens saved yet</div>
      <div style={{ fontSize: 12 }}>Click the ☆ on any token card to add it to your watchlist</div>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 13, color: text2, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span><span style={{ fontWeight: 500, color: text }}>{watchlist.length}</span> saved tokens</span>
        {liveTokens.length > 0 && (
          <span style={{ fontSize: 11, color: green, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: green, display: "inline-block" }} />
            Live prices
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, alignItems: "start" }}>
        {displayTokens.map((token: any) => (
          <div key={token.address} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <DexCard dark={dark} pair={token.pairData ?? {
              baseToken: { address: token.address, symbol: token.symbol, name: token.name },
              priceUsd: String(token.price ?? 0),
              priceChange: { h24: token.price24hChangePercent ?? token.priceChange?.h24 },
              volume: { h24: token.volume24hUSD ?? token.volume?.h24 },
              liquidity: { usd: token.liquidity },
              fdv: token.fdv,
              info: token.info,
              score: token.score,
              label: token.label,
            }} onClick={() => onSelect(token)} />
            <button
              onClick={() => remove(token.address)}
              style={{
                marginTop: 4, width: "100%",
                background: "transparent",
                border: "0.5px solid #D3D1C7",
                borderRadius: 8,
                fontSize: 11, color: "#888780", padding: "5px 0",
                cursor: "pointer",
              }}>
              Remove from watchlist
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
