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

export default function WatchlistTab({ onSelect }: { onSelect: (t: any) => void }) {
  const { watchlist, remove } = useWatchlist();

  if (watchlist.length === 0) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "#888780", fontSize: 14 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>☆</div>
      <div style={{ fontWeight: 500, marginBottom: 6 }}>No tokens saved yet</div>
      <div style={{ fontSize: 12 }}>Click the ☆ on any token card to add it to your watchlist</div>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 13, color: "#888780", marginBottom: 16 }}>
        <span style={{ fontWeight: 500, color: "#2c2c2a" }}>{watchlist.length}</span> saved tokens
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {watchlist.map((token: any) => (
          <div key={token.address} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <DexCard pair={token.pairData ?? {
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
                background: "#FCEBEB", border: "none", borderRadius: 8,
                fontSize: 12, color: "#A32D2D", padding: "6px 0",
                cursor: "pointer", fontWeight: 500,
              }}>
              Remove from watchlist
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
