"use client";

import { useState } from "react";

type Period = "1D" | "7D" | "30D";

function fmt(n?: number) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n/1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPrice(s?: string) {
  const n = parseFloat(s || "0");
  if (!n) return "—";
  if (n >= 1)      return `$${n.toFixed(2)}`;
  if (n >= 0.01)   return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(8)}`;
}

export default function SmartTab({ pairs, onSelect }: { pairs: any[]; onSelect: (p: any) => void }) {
  const [period, setPeriod] = useState<Period>("1D");

  // Map period to available txns key
  const txKey: Record<Period, string> = { "1D": "h24", "7D": "h24", "30D": "h24" };
  const periodNote: Record<Period, string> = {
    "1D": "24h data", "7D": "7D approximated from 24h", "30D": "30D approximated from 24h"
  };
  // Multiplier for approximation
  const mult: Record<Period, number> = { "1D": 1, "7D": 7, "30D": 30 };

  if (!pairs.length) return <div style={{ textAlign: "center", padding: "60px 0", color: "#888780", fontSize: 14 }}>No smart money data.</div>;

  return (
    <div>
      {/* Period toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", border: "0.5px solid #D3D1C7", borderRadius: 8, overflow: "hidden" }}>
          {(["1D", "7D", "30D"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "6px 18px", fontSize: 13, cursor: "pointer", border: "none",
              background: period === p ? "#E6F1FB" : "transparent",
              color: period === p ? "#0C447C" : "#888780", fontWeight: period === p ? 500 : 400,
            }}>{p}</button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#B4B2A9" }}>{periodNote[period]}</div>
      </div>

      {/* Table header */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", gap: 8, padding: "8px 12px",
        fontSize: 11, color: "#888780", fontWeight: 500, borderBottom: "0.5px solid #D3D1C7", marginBottom: 4 }}>
        <div>TOKEN</div>
        <div style={{ textAlign: "right" }}>SM BUYS</div>
        <div style={{ textAlign: "right" }}>NET FLOW</div>
        <div style={{ textAlign: "right" }}>PRICE</div>
        <div style={{ textAlign: "right" }}>TREND</div>
      </div>

      {/* Rows */}
      {pairs.map((pair: any, i: number) => {
        const buys   = Math.round((pair.txns?.h24?.buys  ?? 0) * mult[period]);
        const sells  = Math.round((pair.txns?.h24?.sells ?? 0) * mult[period]);
        const vol    = (pair.volume?.h24 ?? 0) * mult[period];
        const netFlow = (pair.txns?.h24?.buys ?? 0) - (pair.txns?.h24?.sells ?? 0);
        const netFlowVol = vol * (netFlow / ((pair.txns?.h24?.buys ?? 0) + (pair.txns?.h24?.sells ?? 0) + 1));
        const chg = pair.priceChange?.h24 ?? 0;
        const isBull = chg >= 0;
        const imageUrl = pair.info?.imageUrl;
        const symbol = pair.baseToken?.symbol || pair.tokenAddress?.slice(0,6) || "???";
        const name   = pair.baseToken?.name   || "";

        return (
          <div key={i} onClick={() => onSelect({ ...pair, address: pair.baseToken?.address || pair.tokenAddress })}
            style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", gap: 8,
              padding: "10px 12px", borderBottom: "0.5px solid #F1EFE8", cursor: "pointer",
              alignItems: "center", transition: "background 0.1s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F8F8F7")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {/* Token */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#B4B2A9", minWidth: 20 }}>{i + 1}</span>
              {imageUrl ? (
                <img src={imageUrl} width={28} height={28} style={{ borderRadius: "50%" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E6F1FB",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#185FA5" }}>
                  {symbol.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#2c2c2a" }}>{symbol}</div>
                <div style={{ fontSize: 11, color: "#888780" }}>{name.slice(0, 20)}</div>
              </div>
            </div>

            {/* SM Buys */}
            <div style={{ textAlign: "right", fontSize: 13, fontWeight: 500, color: "#3B6D11" }}>{buys.toLocaleString()}</div>

            {/* Net flow */}
            <div style={{ textAlign: "right", fontSize: 13, fontWeight: 500, color: netFlowVol >= 0 ? "#3B6D11" : "#A32D2D" }}>
              {netFlowVol >= 0 ? "+" : ""}{fmt(Math.abs(netFlowVol))}
            </div>

            {/* Price */}
            <div style={{ textAlign: "right", fontSize: 12, color: "#2c2c2a" }}>{fmtPrice(pair.priceUsd)}</div>

            {/* Trend arrow */}
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 18, color: isBull ? "#3B6D11" : "#A32D2D" }}>{isBull ? "↗" : "↘"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
