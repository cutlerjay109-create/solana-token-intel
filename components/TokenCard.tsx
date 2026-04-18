"use client";

interface Token {
  address: string;
  symbol: string;
  name: string;
  score: number;
  label: "safe" | "caution" | "danger";
  price?: number;
  liquidity?: number;
  volume24hUSD?: number;
  price24hChangePercent?: number;
  marketcap?: number;
  fdv?: number;
  logoURI?: string;
  rank?: number;
}

const BADGE = {
  safe:    { bg: "#EAF3DE", color: "#3B6D11", text: "Safe"    },
  caution: { bg: "#FAEEDA", color: "#854F0B", text: "Caution" },
  danger:  { bg: "#FCEBEB", color: "#A32D2D", text: "Danger"  },
};

export default function TokenCard({ token, onClick }: { token: Token; onClick: () => void }) {
  const badge = BADGE[token.label];

  const fmt = (n?: number) =>
    n == null ? "—" : n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : n >= 1_000
      ? `$${(n / 1_000).toFixed(1)}K`
      : `$${n.toFixed(4)}`;

  const fmtPrice = (n?: number) =>
    n == null       ? "—"
    : n >= 1000     ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : n >= 1        ? `$${n.toFixed(2)}`
    : n >= 0.01     ? `$${n.toFixed(4)}`
    : n >= 0.0001   ? `$${n.toFixed(6)}`
    : n >= 0.000001 ? `$${n.toFixed(8)}`
    : `$${n.toFixed(10)}`;

  const chg = token.price24hChangePercent;
  const chgColor = chg == null ? "#888780" : chg >= 0 ? "#3B6D11" : "#A32D2D";
  const chgBg    = chg == null ? "#F1EFE8" : chg >= 0 ? "#EAF3DE" : "#FCEBEB";
  const chgArrow = chg == null ? "" : chg >= 0 ? "▲" : "▼";
  const chgText  = chg == null ? "—" : `${chgArrow} ${Math.abs(chg).toFixed(1)}%`;
  const mc = token.marketcap ?? token.fdv;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/token/${token.address}`;
    navigator.clipboard.writeText(url);
    const btn = e.currentTarget as HTMLButtonElement;
    btn.textContent = "Copied!";
    btn.style.color = "#3B6D11";
    btn.style.background = "#EAF3DE";
    setTimeout(() => {
      btn.textContent = "Share";
      btn.style.color = "#888780";
      btn.style.background = "transparent";
    }, 1500);
  };

  return (
    <div
      onClick={onClick}
      style={{
        background: "#ffffff", border: "0.5px solid #D3D1C7", borderRadius: 12,
        padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10,
        cursor: "pointer", transition: "border-color 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#185FA5")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#D3D1C7")}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {token.logoURI ? (
            <img src={token.logoURI} alt={token.symbol} width={36} height={36}
              style={{ borderRadius: "50%", objectFit: "cover", border: "0.5px solid #D3D1C7" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "#E6F1FB",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 500, color: "#185FA5",
            }}>
              {(token.symbol || "?").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 500, fontSize: 15, color: "#2c2c2a" }}>{token.symbol || "???"}</div>
            <div style={{ fontSize: 12, color: "#888780", marginTop: 1 }}>{token.name || "Unknown"}</div>
          </div>
        </div>
        <span style={{
          background: badge.bg, color: badge.color,
          fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20, flexShrink: 0,
        }}>
          {badge.text}
        </span>
      </div>

      {/* Price + change */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 500, color: "#2c2c2a" }}>{fmtPrice(token.price)}</div>
        <span style={{ background: chgBg, color: chgColor, fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 20 }}>
          {chgText}
        </span>
      </div>

      {/* Risk bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888780", marginBottom: 4 }}>
          <span>Risk score</span>
          <span style={{ fontWeight: 500, color: "#2c2c2a" }}>{token.score}/100</span>
        </div>
        <div style={{ height: 5, background: "#F1EFE8", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${token.score}%`, borderRadius: 4,
            background: token.label === "safe" ? "#639922" : token.label === "caution" ? "#BA7517" : "#E24B4A",
            transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "Liquidity", value: fmt(token.liquidity) },
          { label: "Vol 24h",   value: fmt(token.volume24hUSD) },
          { label: "Mkt cap",   value: fmt(mc) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "#F1EFE8", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 11, color: "#888780" }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#2c2c2a", marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Footer row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: "#B4B2A9", fontFamily: "monospace" }}>
          {token.address.slice(0, 8)}...{token.address.slice(-6)}
        </div>
        <button
          onClick={handleShare}
          style={{
            fontSize: 11, color: "#888780", background: "transparent",
            border: "0.5px solid #D3D1C7", borderRadius: 6,
            padding: "3px 10px", cursor: "pointer",
          }}
        >
          Share
        </button>
      </div>
    </div>
  );
}
