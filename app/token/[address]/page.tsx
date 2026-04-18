"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

interface Token {
  address: string;
  symbol: string;
  name: string;
  score: number;
  label: "safe" | "caution" | "danger";
  price?: number;
  liquidity?: number;
  volume24hUSD?: number;
  volume24hChangePercent?: number;
  price24hChangePercent?: number;
  marketcap?: number;
  fdv?: number;
  logoURI?: string;
  rank?: number;
  decimals?: number;
}

interface Candle {
  o: number; h: number; l: number; c: number;
  v: number; unixTime: number;
}

const BADGE = {
  safe:    { bg: "#EAF3DE", color: "#3B6D11", text: "Safe"    },
  caution: { bg: "#FAEEDA", color: "#854F0B", text: "Caution" },
  danger:  { bg: "#FCEBEB", color: "#A32D2D", text: "Danger"  },
};

function Sparkline({ candles, color }: { candles: Candle[]; color: string }) {
  if (!candles.length) return null;
  const prices = candles.map(c => c.c);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 600, H = 120, pad = 8;
  const pts = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (W - pad * 2);
    const y = H - pad - ((p - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const highIdx = prices.indexOf(high);
  const lowIdx = prices.indexOf(low);
  const hx = pad + (highIdx / (prices.length - 1)) * (W - pad * 2);
  const hy = H - pad - ((high - min) / range) * (H - pad * 2);
  const lx = pad + (lowIdx / (prices.length - 1)) * (W - pad * 2);
  const ly = H - pad - ((low - min) / range) * (H - pad * 2);

  const fmtP = (n: number) =>
    n >= 1 ? `$${n.toFixed(2)}`
    : n >= 0.0001 ? `$${n.toFixed(6)}`
    : `$${n.toFixed(8)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#D3D1C7" strokeWidth="0.5" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={hx} cy={hy} r="4" fill="#3B6D11" />
      <text x={hx} y={hy - 8} textAnchor="middle" fontSize="10" fill="#3B6D11">{fmtP(high)}</text>
      <circle cx={lx} cy={ly} r="4" fill="#A32D2D" />
      <text x={lx} y={ly + 16} textAnchor="middle" fontSize="10" fill="#A32D2D">{fmtP(low)}</text>
    </svg>
  );
}

export default function TokenPage() {
  const { address } = useParams<{ address: string }>();
  const router = useRouter();
  const [token, setToken] = useState<Token | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current || !address) return;
    fetchedRef.current = true;

    const load = async () => {
      try {
        const [trendRes, ohlcvRes] = await Promise.all([
          fetch(`/api/birdeye?type=trending&t=${Date.now()}`),
          fetch(`/api/birdeye?type=ohlcv&address=${address}`),
        ]);
        const trendJson = await trendRes.json();
        const ohlcvJson = await ohlcvRes.json();

        const found = (trendJson.data || []).find((t: Token) => t.address === address);
        setToken(found || null);
        setCandles(ohlcvJson.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [address]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmtPrice = (n?: number) =>
    n == null       ? "—"
    : n >= 1000     ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : n >= 1        ? `$${n.toFixed(2)}`
    : n >= 0.01     ? `$${n.toFixed(4)}`
    : n >= 0.0001   ? `$${n.toFixed(6)}`
    : n >= 0.000001 ? `$${n.toFixed(8)}`
    : `$${n.toFixed(10)}`;

  const fmt = (n?: number) =>
    n == null ? "—" : n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : n >= 1_000
      ? `$${(n / 1_000).toFixed(1)}K`
      : `$${n.toFixed(2)}`;

  if (loading) return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "60px 20px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", textAlign: "center" }}>
      <div style={{ fontSize: 14, color: "#888780" }}>Loading token data...</div>
    </main>
  );

  if (!token) return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "60px 20px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", textAlign: "center" }}>
      <div style={{ fontSize: 14, color: "#888780", marginBottom: 16 }}>Token not found in current trending list.</div>
      <button onClick={() => router.push("/")} style={{
        padding: "8px 18px", fontSize: 13, cursor: "pointer",
        border: "0.5px solid #D3D1C7", borderRadius: 8,
        background: "transparent", color: "#2c2c2a",
      }}>Back to dashboard</button>
    </main>
  );

  const badge = BADGE[token.label];
  const chg = token.price24hChangePercent;
  const chgColor = chg == null ? "#888780" : chg >= 0 ? "#3B6D11" : "#A32D2D";
  const chgBg    = chg == null ? "#F1EFE8" : chg >= 0 ? "#EAF3DE" : "#FCEBEB";
  const chgArrow = chg == null ? "" : chg >= 0 ? "▲" : "▼";
  const chartColor = chg == null ? "#888780" : chg >= 0 ? "#639922" : "#E24B4A";

  const riskFactors = [
    { label: "Liquidity",   ok: (token.liquidity ?? 0) >= 100_000,               detail: (token.liquidity ?? 0) >= 100_000 ? "Healthy liquidity" : "Low liquidity — easy to manipulate" },
    { label: "Price action",ok: Math.abs(chg ?? 0) <= 100,                        detail: Math.abs(chg ?? 0) <= 100 ? "Stable price movement" : `Extreme move: ${chg?.toFixed(0)}% in 24h` },
    { label: "Volume spike",ok: Math.abs(token.volume24hChangePercent ?? 0) <= 1000, detail: Math.abs(token.volume24hChangePercent ?? 0) <= 1000 ? "Normal volume" : "Abnormal volume spike" },
    { label: "Market cap",  ok: (token.marketcap ?? token.fdv ?? 0) >= 500_000,  detail: (token.marketcap ?? token.fdv ?? 0) >= 500_000 ? "Reasonable market cap" : "Very low market cap" },
  ];

  const rows = [
    { label: "Price",         value: fmtPrice(token.price) },
    { label: "24h change",    value: chg == null ? "—" : `${chgArrow} ${Math.abs(chg).toFixed(2)}%`, color: chgColor },
    { label: "Liquidity",     value: fmt(token.liquidity) },
    { label: "Volume 24h",    value: fmt(token.volume24hUSD) },
    { label: "Market cap",    value: fmt(token.marketcap ?? token.fdv) },
    { label: "FDV",           value: fmt(token.fdv) },
    { label: "Trending rank", value: token.rank ? `#${token.rank}` : "—" },
  ];

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Back */}
      <button onClick={() => router.push("/")} style={{
        background: "none", border: "none", cursor: "pointer",
        fontSize: 13, color: "#888780", marginBottom: 20, padding: 0,
      }}>
        ← Back to dashboard
      </button>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {token.logoURI ? (
            <img src={token.logoURI} alt={token.symbol} width={52} height={52}
              style={{ borderRadius: "50%", objectFit: "cover", border: "0.5px solid #D3D1C7" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: "50%", background: "#E6F1FB",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 500, color: "#185FA5",
            }}>
              {(token.symbol || "?").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: 22, fontWeight: 500, color: "#2c2c2a" }}>{token.symbol}</div>
            <div style={{ fontSize: 14, color: "#888780" }}>{token.name}</div>
          </div>
        </div>
        <span style={{ background: badge.bg, color: badge.color, fontSize: 12, fontWeight: 500, padding: "4px 14px", borderRadius: 20 }}>
          {badge.text}
        </span>
      </div>

      {/* Price row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 500, color: "#2c2c2a" }}>{fmtPrice(token.price)}</div>
        <span style={{ background: chgBg, color: chgColor, fontSize: 14, fontWeight: 500, padding: "5px 14px", borderRadius: 20 }}>
          {chg == null ? "—" : `${chgArrow} ${Math.abs(chg).toFixed(2)}%`}
        </span>
      </div>

      {/* Chart */}
      <div style={{ background: "#F1EFE8", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
        {candles.length > 0 ? (
          <Sparkline candles={candles} color={chartColor} />
        ) : (
          <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#888780" }}>
            No chart data
          </div>
        )}
        <div style={{ fontSize: 11, color: "#888780", marginTop: 6, textAlign: "right" }}>
          24h price history · Birdeye /defi/ohlcv
        </div>
      </div>

      {/* Risk score */}
      <div style={{ background: "#F1EFE8", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: "#888780" }}>Risk score</span>
          <span style={{ fontSize: 20, fontWeight: 500, color: "#2c2c2a" }}>{token.score}/100</span>
        </div>
        <div style={{ height: 8, background: "#D3D1C7", borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
          <div style={{
            height: "100%", width: `${token.score}%`, borderRadius: 4,
            background: token.label === "safe" ? "#639922" : token.label === "caution" ? "#BA7517" : "#E24B4A",
          }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {riskFactors.map(({ label, ok, detail }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: ok ? "#EAF3DE" : "#FCEBEB", borderRadius: 8, padding: "8px 12px",
            }}>
              <span style={{ fontSize: 14, color: ok ? "#3B6D11" : "#A32D2D" }}>{ok ? "✓" : "✗"}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: ok ? "#3B6D11" : "#A32D2D" }}>{label}</div>
                <div style={{ fontSize: 11, color: ok ? "#3B6D11" : "#A32D2D", opacity: 0.8 }}>{detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ border: "0.5px solid #D3D1C7", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
        {rows.map(({ label, value, color }, i) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between", padding: "10px 16px",
            background: i % 2 === 0 ? "#ffffff" : "#F1EFE8", fontSize: 13,
          }}>
            <span style={{ color: "#888780" }}>{label}</span>
            <span style={{ fontWeight: 500, color: color ?? "#2c2c2a" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Address */}
      <div style={{ background: "#F1EFE8", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#888780", marginBottom: 4 }}>Contract address</div>
        <div style={{ fontSize: 12, fontFamily: "monospace", color: "#2c2c2a", wordBreak: "break-all" }}>
          {token.address}
        </div>
      </div>

      {/* Share + links */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={copyLink} style={{
          flex: 1, padding: "10px 0", fontSize: 13, cursor: "pointer",
          border: "0.5px solid #D3D1C7", borderRadius: 8,
          background: copied ? "#EAF3DE" : "transparent",
          color: copied ? "#3B6D11" : "#2c2c2a", fontWeight: 500,
        }}>
          {copied ? "✓ Link copied!" : "Copy share link"}
        </button>
        <a href={`https://solscan.io/token/${token.address}`} target="_blank"
          style={{ flex: 1, padding: "10px 0", textAlign: "center", border: "0.5px solid #D3D1C7",
            borderRadius: 8, fontSize: 13, color: "#185FA5", textDecoration: "none", fontWeight: 500 }}>
          Solscan
        </a>
        <a href={`https://birdeye.so/token/${token.address}?chain=solana`} target="_blank"
          style={{ flex: 1, padding: "10px 0", textAlign: "center", border: "0.5px solid #D3D1C7",
            borderRadius: 8, fontSize: 13, color: "#185FA5", textDecoration: "none", fontWeight: 500 }}>
          Birdeye
        </a>
      </div>

      <div style={{ fontSize: 12, color: "#B4B2A9", textAlign: "center", marginTop: 24 }}>
        Powered by Birdeye Data · Solana Token Intel
      </div>
    </main>
  );
}
