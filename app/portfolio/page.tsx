"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PortfolioPage() {
  const [wallet, setWallet] = useState("");
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [searched, setSearched] = useState(false);
  const router = useRouter();

  const lookup = async () => {
    if (!wallet.trim()) return;
    setLoading(true);
    setError("");
    setTokens([]);
    try {
      const res  = await fetch(`/api/portfolio?wallet=${wallet.trim()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to fetch");
      setTokens(json.data || []);
      setSearched(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n?: number) =>
    n == null ? "—"
    : n >= 1_000_000 ? `$${(n/1_000_000).toFixed(2)}M`
    : n >= 1_000 ? `$${(n/1_000).toFixed(1)}K`
    : `$${n.toFixed(2)}`;

  const fmtPrice = (n?: number) => {
    if (!n) return "—";
    if (n >= 1) return `$${n.toFixed(2)}`;
    if (n >= 0.0001) return `$${n.toFixed(6)}`;
    return `$${n.toFixed(8)}`;
  };

  const BADGE: Record<string, {bg:string;color:string}> = {
    safe:    {bg:"#EAF3DE",color:"#3B6D11"},
    caution: {bg:"#FAEEDA",color:"#854F0B"},
    danger:  {bg:"#FCEBEB",color:"#A32D2D"},
  };

  const totalValue = tokens.reduce((s, t) => s + (t.valueUsd ?? 0), 0);
  const riskCounts = {
    safe:    tokens.filter(t => t.label === "safe").length,
    caution: tokens.filter(t => t.label === "caution").length,
    danger:  tokens.filter(t => t.label === "danger").length,
  };
  const avgScore = tokens.length ? Math.round(tokens.reduce((s,t) => s + (t.score??50), 0) / tokens.length) : 0;

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <button onClick={() => router.push("/")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#888780", marginBottom: 20, padding: 0 }}>
        ← Back to dashboard
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 500, color: "#2c2c2a", margin: "0 0 6px" }}>Portfolio Risk Checker</h1>
      <p style={{ fontSize: 14, color: "#888780", marginBottom: 24 }}>Enter any Solana wallet address to see a risk breakdown of all tokens held.</p>

      {/* Search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Enter Solana wallet address..."
          value={wallet}
          onChange={e => setWallet(e.target.value)}
          onKeyDown={e => e.key === "Enter" && lookup()}
          style={{ flex: 1, fontSize: 13, padding: "10px 14px", border: "0.5px solid #D3D1C7", borderRadius: 8, outline: "none", background: "transparent", color: "inherit" }}
        />
        <button onClick={lookup} disabled={loading} style={{
          padding: "10px 20px", fontSize: 13, cursor: "pointer", borderRadius: 8,
          background: "#185FA5", color: "#ffffff", border: "none", fontWeight: 500,
        }}>
          {loading ? "Checking..." : "Analyse"}
        </button>
      </div>

      {error && <div style={{ background: "#FCEBEB", color: "#A32D2D", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {searched && !loading && tokens.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#888780", fontSize: 14 }}>No tokens found for this wallet.</div>
      )}

      {tokens.length > 0 && (
        <>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 24 }}>
            {[
              { label: "Total value",   value: fmt(totalValue),           bg: "#E6F1FB", color: "#0C447C" },
              { label: "Avg risk score",value: avgScore + "/100",         bg: avgScore>=70?"#EAF3DE":avgScore>=40?"#FAEEDA":"#FCEBEB", color: avgScore>=70?"#3B6D11":avgScore>=40?"#854F0B":"#A32D2D" },
              { label: "Safe tokens",   value: String(riskCounts.safe),   bg: "#EAF3DE", color: "#3B6D11" },
              { label: "Danger tokens", value: String(riskCounts.danger), bg: "#FCEBEB", color: "#A32D2D" },
            ].map(({ label, value, bg, color }) => (
              <div key={label} style={{ background: bg, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 500, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Token list */}
          <div style={{ border: "0.5px solid #D3D1C7", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", gap: 8,
              padding: "8px 14px", fontSize: 11, color: "#888780", fontWeight: 500,
              borderBottom: "0.5px solid #D3D1C7", background: "#F8F8F7" }}>
              <div>TOKEN</div>
              <div style={{ textAlign: "right" }}>PRICE</div>
              <div style={{ textAlign: "right" }}>VALUE</div>
              <div style={{ textAlign: "right" }}>SCORE</div>
              <div style={{ textAlign: "right" }}>RISK</div>
            </div>
            {tokens.map((token: any, i: number) => {
              const badge = BADGE[token.label] || BADGE.caution;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", gap: 8,
                  padding: "10px 14px", borderBottom: i < tokens.length-1 ? "0.5px solid #F1EFE8" : "none",
                  background: i % 2 === 0 ? "#ffffff" : "#fafaf9", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {token.logoURI ? (
                      <img src={token.logoURI} width={24} height={24} style={{ borderRadius: "50%" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#E6F1FB",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, color: "#185FA5" }}>
                        {(token.symbol||"?").slice(0,2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#2c2c2a" }}>{token.symbol}</div>
                      <div style={{ fontSize: 11, color: "#888780" }}>{token.name?.slice(0,20)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12, color: "#2c2c2a" }}>{fmtPrice(token.price)}</div>
                  <div style={{ textAlign: "right", fontSize: 12, fontWeight: 500, color: "#2c2c2a" }}>{fmt(token.valueUsd)}</div>
                  <div style={{ textAlign: "right", fontSize: 12, fontWeight: 500, color: "#2c2c2a" }}>{token.score}/100</div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20 }}>
                      {token.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ marginTop: 32, fontSize: 11, color: "#B4B2A9", textAlign: "center" }}>
        Powered by Birdeye Data · Not financial advice
      </div>
    </main>
  );
}
