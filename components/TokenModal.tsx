"use client";

import { useEffect, useState, useRef } from "react";

const BADGE: Record<string, { bg: string; darkBg: string; color: string; darkColor: string; text: string }> = {
  safe:    { bg: "#EAF3DE", darkBg: "#1a2e14", color: "#3B6D11", darkColor: "#7bc96f", text: "Safe"    },
  caution: { bg: "#FAEEDA", darkBg: "#2e2210", color: "#854F0B", darkColor: "#e8a44a", text: "Caution" },
  danger:  { bg: "#FCEBEB", darkBg: "#2e1414", color: "#A32D2D", darkColor: "#f47c7c", text: "Danger"  },
};

interface Candle { o: number; h: number; l: number; c: number; v: number; unixTime: number; }
const ohlcvCache: Record<string, Candle[]> = {};

function Sparkline({ candles, color }: { candles: Candle[]; color: string }) {
  if (!candles.length) return null;
  const prices = candles.map(c => c.c);
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const W = 440, H = 80, pad = 4;
  const pts = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (W - pad * 2);
    const y = H - pad - ((p - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#3a3a38" strokeWidth="0.5" />
    </svg>
  );
}

function fmt(n: any): string {
  const v = Number(n);
  if (n == null || isNaN(v)) return "—";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function fmtPrice(n: any): string {
  const v = Number(n);
  if (n == null || isNaN(v) || v === 0) return "—";
  if (v >= 1000)     return `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (v >= 1)        return `$${v.toFixed(2)}`;
  if (v >= 0.01)     return `$${v.toFixed(4)}`;
  if (v >= 0.0001)   return `$${v.toFixed(6)}`;
  if (v >= 0.000001) return `$${v.toFixed(8)}`;
  return `$${v.toFixed(10)}`;
}

export default function TokenModal({ token, onClose, dark = false }: { token: any; onClose: () => void; dark?: boolean }) {
  const [candles, setCandles]           = useState<Candle[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [dexData, setDexData]           = useState<any>(null);
  const fetchedRef = useRef(false);

  // Colors based on dark mode
  const bg        = dark ? "#1e1e1c" : "#ffffff";
  const bgSecond  = dark ? "#2a2a28" : "#F1EFE8";
  const bgThird   = dark ? "#333331" : "#fafaf9";
  const border    = dark ? "#3a3a38" : "#D3D1C7";
  const textPrim  = dark ? "#e8e6df" : "#2c2c2a";
  const textMuted = dark ? "#9c9a92" : "#888780";
  const textDim   = dark ? "#6a6a68" : "#B4B2A9";

  const address  = token.address || token.baseToken?.address || token.tokenAddress || "";
  const symbol   = token.symbol  || token.baseToken?.symbol  || "???";
  const name     = token.name    || token.baseToken?.name    || address.slice(0, 8);
  const imageUrl = token.info?.imageUrl || token.logoURI || token.pairData?.info?.imageUrl;

  const price = Number(token.price || token.priceUsd || token.pairData?.priceUsd || 0);
  const chg   = token.price24hChangePercent ?? token.priceChange?.h24 ?? token.pairData?.priceChange?.h24 ?? dexData?.priceChange?.h24 ?? null;
  const liq   = token.liquidity ?? token.pairData?.liquidity?.usd ?? dexData?.liquidity?.usd ?? null;
  const vol   = token.volume24hUSD ?? token.volume?.h24 ?? token.pairData?.volume?.h24 ?? dexData?.volume?.h24 ?? null;
  const fdv   = token.fdv ?? token.pairData?.fdv ?? dexData?.fdv ?? null;
  const mcap  = token.marketcap ?? token.pairData?.marketCap ?? dexData?.marketCap ?? fdv ?? null;
  const socials  = token.info?.socials  || token.pairData?.info?.socials  || dexData?.info?.socials  || [];
  const websites = token.info?.websites || token.pairData?.info?.websites || dexData?.info?.websites || [];
  const createdAt = token.pairCreatedAt ?? token.pairData?.pairCreatedAt ?? dexData?.pairCreatedAt ?? null;
  const txns  = token.txns || token.pairData?.txns || dexData?.txns;
  const buys  = txns?.h24?.buys  ?? 0;
  const sells = txns?.h24?.sells ?? 0;
  const score = token.score ?? 50;
  const label = token.label ?? "caution";
  const badge = BADGE[label];

  const chgPos     = chg != null && chg >= 0;
  const chgColor   = chg == null ? textMuted : chgPos ? (dark ? "#7bc96f" : "#3B6D11") : (dark ? "#f47c7c" : "#A32D2D");
  const chgBg      = chg == null ? bgSecond  : chgPos ? (dark ? "#1a2e14" : "#EAF3DE") : (dark ? "#2e1414" : "#FCEBEB");
  const chgArrow   = chg == null ? "" : chgPos ? "▲" : "▼";
  const chartColor = chg == null ? textMuted : chgPos ? "#639922" : "#E24B4A";

  const createdStr = createdAt
    ? new Date(createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
      + "  " + new Date(createdAt).toLocaleTimeString("en-GB")
    : null;

  useEffect(() => {
    if (fetchedRef.current || !address) return;
    fetchedRef.current = true;
    if (ohlcvCache[address]) {
      setCandles(ohlcvCache[address]);
      setChartLoading(false);
    } else {
      fetch(`/api/birdeye?type=ohlcv&address=${address}`)
        .then(r => r.json()).then(j => { ohlcvCache[address] = j.data || []; setCandles(j.data || []); })
        .catch(() => setCandles([])).finally(() => setChartLoading(false));
    }
    const hasDex = liq != null && vol != null && createdAt != null;
    if (!hasDex) {
      fetch(`/api/dexscreener?type=token&address=${address}`)
        .then(r => r.json()).then(j => { if (j.data) setDexData(j.data); }).catch(() => {});
    }
  }, [address]);

  const rows = [
    { label: "Price",         value: fmtPrice(price) },
    { label: "24h change",    value: chg == null ? "—" : `${chgArrow} ${Math.abs(Number(chg)).toFixed(2)}%`, color: chgColor },
    { label: "Liquidity",     value: fmt(liq) },
    { label: "Volume 24h",    value: fmt(vol) },
    { label: "Market cap",    value: fmt(mcap) },
    { label: "FDV",           value: fmt(fdv) },
    { label: "Buys 24h",      value: buys  > 0 ? buys.toLocaleString()  : "—" },
    { label: "Sells 24h",     value: sells > 0 ? sells.toLocaleString() : "—" },
    { label: "Created",       value: createdStr ?? "—" },
    { label: "DEX",           value: token.dexId ?? token.pairData?.dexId ?? dexData?.dexId ?? "—" },
    { label: "Trending rank", value: token.rank ? `#${token.rank}` : "—" },
  ];

  const riskFactors = [
    { label: "Liquidity",    ok: (Number(liq)||0) >= 100_000,         detail: (Number(liq)||0) >= 100_000 ? "Healthy liquidity" : "Low liquidity — easy to manipulate" },
    { label: "Price action", ok: Math.abs(chg ?? 0) <= 100,           detail: Math.abs(chg ?? 0) <= 100 ? "Stable price movement" : `Extreme move: ${Number(chg).toFixed(0)}% in 24h` },
    { label: "Volume spike", ok: Math.abs(token.volume24hChangePercent ?? 0) <= 1000, detail: Math.abs(token.volume24hChangePercent ?? 0) <= 1000 ? "Normal volume" : "Abnormal volume spike" },
    { label: "Market cap",   ok: (Number(mcap)||0) >= 500_000,        detail: (Number(mcap)||0) >= 500_000 ? "Reasonable market cap" : "Very low market cap" },
  ];

  const SOCIAL_LABELS: Record<string, string> = { twitter: "X", telegram: "TG", discord: "DC" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 16, padding: "24px",
        width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 16, border: `0.5px solid ${border}` }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {imageUrl ? (
              <img src={imageUrl} width={44} height={44} style={{ borderRadius: "50%", objectFit: "cover", border: `0.5px solid ${border}` }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: dark ? "#0f2035" : "#E6F1FB",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 500, color: dark ? "#5ba3e8" : "#185FA5" }}>
                {symbol.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 500, color: textPrim }}>{symbol}</div>
              <div style={{ fontSize: 13, color: textMuted }}>{name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: bgSecond, border: "none", borderRadius: 8,
            width: 32, height: 32, cursor: "pointer", fontSize: 16, color: textMuted }}>X</button>
        </div>

        {/* Price + chart */}
        <div style={{ background: bgSecond, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: textMuted, marginBottom: 2 }}>Current price</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: textPrim }}>{fmtPrice(price)}</div>
            </div>
            <span style={{ background: chgBg, color: chgColor, fontSize: 13, fontWeight: 500, padding: "4px 12px", borderRadius: 20 }}>
              {chg == null ? "—" : `${chgArrow} ${Math.abs(Number(chg)).toFixed(2)}%`}
            </span>
          </div>
          {chartLoading ? (
            <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: textMuted }}>Loading chart...</div>
          ) : candles.length > 0 ? (
            <Sparkline candles={candles} color={chartColor} />
          ) : (
            <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: textMuted }}>No chart data</div>
          )}
          <div style={{ fontSize: 11, color: textDim, marginTop: 4, textAlign: "right" }}>24h price history · Birdeye</div>
        </div>

        {/* Risk score */}
        <div style={{ background: bgSecond, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: textMuted }}>Risk score</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 500, color: textPrim }}>{score}/100</span>
              <span style={{ background: dark ? badge.darkBg : badge.bg, color: dark ? badge.darkColor : badge.color, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20 }}>
                {badge.text}
              </span>
            </div>
          </div>
          <div style={{ height: 6, background: dark ? "#3a3a38" : "#D3D1C7", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${score}%`, borderRadius: 4,
              background: label === "safe" ? "#639922" : label === "caution" ? "#BA7517" : "#E24B4A" }} />
          </div>
        </div>

        {/* Risk breakdown */}
        <div>
          <div style={{ fontSize: 12, color: textMuted, marginBottom: 8, fontWeight: 500 }}>Risk breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {riskFactors.map(({ label: rl, ok, detail }) => {
              const okColor  = dark ? "#7bc96f" : "#3B6D11";
              const nokColor = dark ? "#f47c7c" : "#A32D2D";
              const okBg     = dark ? "#1a2e14"  : "#EAF3DE";
              const nokBg    = dark ? "#2e1414"  : "#FCEBEB";
              return (
                <div key={rl} style={{ display: "flex", alignItems: "center", gap: 10,
                  background: ok ? okBg : nokBg, borderRadius: 8, padding: "8px 12px" }}>
                  <span style={{ fontSize: 14, color: ok ? okColor : nokColor }}>{ok ? "✓" : "✗"}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: ok ? okColor : nokColor }}>{rl}</div>
                    <div style={{ fontSize: 11, color: ok ? okColor : nokColor, opacity: 0.8 }}>{detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Token data */}
        <div>
          <div style={{ fontSize: 12, color: textMuted, marginBottom: 8, fontWeight: 500 }}>Token data</div>
          <div style={{ border: `0.5px solid ${border}`, borderRadius: 10, overflow: "hidden" }}>
            {rows.map(({ label: rl, value, color }, i) => (
              <div key={rl} style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px",
                background: i % 2 === 0 ? bg : bgSecond, fontSize: 13 }}>
                <span style={{ color: textMuted }}>{rl}</span>
                <span style={{ fontWeight: 500, color: color ?? textPrim }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Socials */}
        {(socials.length > 0 || websites.length > 0) && (
          <div>
            <div style={{ fontSize: 12, color: textMuted, marginBottom: 8, fontWeight: 500 }}>Socials</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {socials.map((s: any, i: number) => (
                <a key={i} href={s.url} target="_blank" style={{ fontSize: 13, fontWeight: 500, padding: "6px 16px", borderRadius: 8,
                  background: dark ? "#0f2035" : "#E6F1FB", color: dark ? "#5ba3e8" : "#185FA5",
                  textDecoration: "none", border: `0.5px solid ${border}` }}>
                  {SOCIAL_LABELS[s.type?.toLowerCase()] || s.type}
                </a>
              ))}
              {websites.map((w: any, i: number) => (
                <a key={i} href={w.url} target="_blank" style={{ fontSize: 13, fontWeight: 500, padding: "6px 16px", borderRadius: 8,
                  background: dark ? "#0f2035" : "#E6F1FB", color: dark ? "#5ba3e8" : "#185FA5",
                  textDecoration: "none", border: `0.5px solid ${border}` }}>
                  Website
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Address */}
        <div style={{ background: bgSecond, borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 11, color: textMuted, marginBottom: 4 }}>Contract address</div>
          <div style={{ fontSize: 12, fontFamily: "monospace", color: textPrim, wordBreak: "break-all" }}>{address}</div>
        </div>

        {/* Link */}
        <a href={`https://birdeye.so/token/${address}?chain=solana`} target="_blank" style={{
          display: "block", padding: "10px 0", textAlign: "center",
          border: `0.5px solid ${border}`, borderRadius: 8,
          fontSize: 13, color: dark ? "#5ba3e8" : "#185FA5",
          textDecoration: "none", fontWeight: 500,
          background: dark ? "#0f2035" : "transparent",
        }}>
          View on Birdeye
        </a>

      </div>
    </div>
  );
}
