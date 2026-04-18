"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import TokenModal from "@/components/TokenModal";
import DexCard from "@/components/DexCard";
import WhaleTab from "@/components/WhaleTab";
import MemeTab from "@/components/MemeTab";
import SmartTab from "@/components/SmartTab";
import TrendingDexTab from "@/components/TrendingDexTab";
import WatchlistTab, { useWatchlist } from "@/components/WatchlistTab";

const ALL_TABS = ["trending", "live", "whale", "meme", "smart", "defi", "watchlist"] as const;
type Tab = typeof ALL_TABS[number];

const FILTERS_BIRDEYE = ["all", "safe", "caution", "danger"] as const;
type BirdeyeFilter = typeof FILTERS_BIRDEYE[number];
type SortKey = "rank" | "score" | "volume" | "change";

const TAB_LABELS: Record<Tab, string> = {
  trending:  "Trending",
  live:      "Live feed",
  whale:     "Whale radar",
  meme:      "Meme monitor",
  smart:     "Smart money",
  defi:      "DeFi pulse",
  watchlist: "☆ Watchlist",
};

const TAB_DESC: Record<Tab, string> = {
  trending: "Top tokens by momentum · Birdeye ",
  live:     "Newest token launches on Solana ",
  whale:    "Highest volume whale activity ",
  meme:     "Low mcap, high momentum meme tokens ",
  smart:    "Boosted tokens with smart money backing ",
  defi:     "Highest liquidity DeFi pairs ",
  watchlist: "Your saved tokens",
};

// Auto-refresh intervals per tab (ms), 0 = manual only
const REFRESH_INTERVALS: Record<Tab, number> = {
  trending:  0,
  live:      10_000,
  whale:     15_000,
  meme:      30_000,
  smart:     0,
  defi:      25_000,
  watchlist: 0,
};

function timeAgo(ts?: number) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

export default function Home() {
  const { watchlist, add: addToWatchlist, remove: removeFromWatchlist, has: inWatchlist } = useWatchlist();
  const [tab, setTab]                     = useState<Tab>("trending");
  const [trendView, setTrendView]           = useState<"birdeye" | "dex">("birdeye");
  const [darkMode, setDarkMode]             = useState(false);
  const [paused, setPaused]                 = useState(false);
  const [tokens, setTokens]               = useState<any[]>([]);
  const [dexPairs, setDexPairs]           = useState<any[]>([]);
  const [totalPairs, setTotalPairs]       = useState(0);
  const [totalVolume, setTotalVolume]     = useState(0);
  const [totalTxns, setTotalTxns]         = useState(0);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [bFilter, setBFilter]             = useState<BirdeyeFilter>("all");
  const [dexFilter, setDexFilter]         = useState("all");
  const [sort, setSort]                   = useState<SortKey>("rank");
  const [search, setSearch]               = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching]         = useState(false);
  const [lastUpdated, setLastUpdated]     = useState<Date | null>(null);
  const [selected, setSelected]           = useState<any | null>(null);
  const [countdown, setCountdown]         = useState(0);
  const intervalRef = useRef<any>(null);
  const countRef    = useRef<any>(null);
  const pausedRef   = useRef(false);

  const fetchTrending = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const t = Date.now();

      // 1. Fetch Birdeye trending + 6 diverse DexScreener searches in parallel
      const [bRes, d1, d2, d3, d4, d5, d6] = await Promise.all([
        fetch(`/api/birdeye?type=trending&t=${t}`),
        fetch(`/api/dexscreener?type=search&q=pump`),
        fetch(`/api/dexscreener?type=search&q=JUP`),
        fetch(`/api/dexscreener?type=search&q=WIF`),
        fetch(`/api/dexscreener?type=search&q=RAY`),
        fetch(`/api/dexscreener?type=search&q=ORCA`),
        fetch(`/api/dexscreener?type=search&q=PYTH`),
      ]);

      const [bJson, j1, j2, j3, j4, j5, j6] = await Promise.all([
        bRes.json(), d1.json(), d2.json(),
        d3.json(), d4.json(), d5.json(), d6.json()
      ]);

      const bTokens: any[] = bJson.data || [];

      // 2. Collect all DexScreener pairs
      const allDexPairs: any[] = [
        ...(j1.data || []), ...(j2.data || []),
        ...(j3.data || []), ...(j4.data || []),
        ...(j5.data || []), ...(j6.data || []),
      ];

      // 3. Fetch DexScreener metadata for Birdeye tokens
      const bAddresses = bTokens.map((t: any) => t.address).join(",");
      const metaRes  = await fetch(`/api/dexscreener?type=batch&addresses=${bAddresses}`);
      const metaJson = await metaRes.json();
      const dexMap: Record<string, any> = metaJson.data || {};

      // 4. Enrich Birdeye tokens with DexScreener metadata
      const enrichedBirdeye = bTokens.map((token: any) => {
        const dex = dexMap[token.address];
        return {
          ...token,
          _source:       "birdeye",
          pairCreatedAt: dex?.pairCreatedAt ?? null,
          dexId:         dex?.dexId         ?? null,
          txns:          dex?.txns          ?? null,
          info: {
            imageUrl: dex?.info?.imageUrl ?? token.logoURI ?? null,
            socials:  dex?.info?.socials  ?? [],
            websites: dex?.info?.websites ?? [],
          },
        };
      });

      // 5. Deduplicate DexScreener pairs — one entry per base token address
      //    keep highest liquidity pair when same token appears multiple times
      const birdeyeSet = new Set(bTokens.map((t: any) => t.address));
      const bestPair   = new Map<string, any>();

      for (const pair of allDexPairs) {
        const addr = pair.baseToken?.address;
        if (!addr || birdeyeSet.has(addr)) continue;
        const existing = bestPair.get(addr);
        if (!existing || (pair.liquidity?.usd ?? 0) > (existing.liquidity?.usd ?? 0)) {
          bestPair.set(addr, pair);
        }
      }

      // 6. Convert best DexScreener pairs to unified shape, sort by volume
      const enrichedDex = Array.from(bestPair.values())
        .filter((pair: any) => (pair.liquidity?.usd ?? 0) > 5000)
        .sort((a: any, b: any) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0))
        .slice(0, 40)
        .map((pair: any) => ({
          address:               pair.baseToken?.address,
          symbol:                pair.baseToken?.symbol,
          name:                  pair.baseToken?.name,
          price:                 parseFloat(pair.priceUsd || "0"),
          price24hChangePercent: pair.priceChange?.h24  ?? 0,
          volume24hUSD:          pair.volume?.h24        ?? 0,
          liquidity:             pair.liquidity?.usd     ?? 0,
          fdv:                   pair.fdv                ?? 0,
          marketcap:             pair.marketCap ?? pair.fdv ?? 0,
          score:                 pair.score  ?? 50,
          label:                 pair.label  ?? "caution",
          rank:                  null,
          pairCreatedAt:         pair.pairCreatedAt ?? null,
          dexId:                 pair.dexId         ?? null,
          txns:                  pair.txns          ?? null,
          _source:               "dexscreener",
          info: {
            imageUrl: pair.info?.imageUrl ?? null,
            socials:  pair.info?.socials  ?? [],
            websites: pair.info?.websites ?? [],
          },
        }));

      // 7. Merge: Birdeye first (accurate risk scores), then DexScreener extras
      const merged = [...enrichedBirdeye, ...enrichedDex].map((t, i) => ({ ...t, rank: t.rank ?? i + 1 }));
      setTokens(merged);
      setTotalPairs(merged.length);
      setLastUpdated(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const fetchDex = useCallback(async (t: Tab, f = "all", background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/dexscreener?type=${t}&filter=${f}&t=${Date.now()}`);
      const json = await res.json();
      setDexPairs(json.data || []);
      setTotalPairs(json.total || json.data?.length || 0);
      setTotalVolume(json.totalVolume || 0);
      setTotalTxns(json.totalTxns || 0);
      setLastUpdated(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Load saved dark mode preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("darkMode") === "true";
    if (saved) setDarkMode(true);
  }, []);

  // Apply dark mode class whenever it changes
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
  }, [darkMode]);

  const doRefresh = useCallback((background = false) => {
    if (tab === "trending") fetchTrending(background);
    else fetchDex(tab, dexFilter, background);
  }, [tab, dexFilter, fetchTrending, fetchDex]);

  // Setup auto-refresh + countdown
  useEffect(() => {
    doRefresh();
    const interval = REFRESH_INTERVALS[tab];
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countRef.current)    clearInterval(countRef.current);
    if (interval > 0) {
      setCountdown(interval / 1000);
      intervalRef.current = setInterval(() => { if (!pausedRef.current) doRefresh(true); }, interval);
      countRef.current = setInterval(() => setCountdown(c => c <= 1 ? interval / 1000 : c - 1), 1000);
    } else {
      setCountdown(0);
    }
    return () => { clearInterval(intervalRef.current); clearInterval(countRef.current); };
  }, [tab, dexFilter]);

  // Search
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const id = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/dexscreener?type=search&q=${encodeURIComponent(search)}`);
        const json = await res.json();
        setSearchResults(json.data || []);
      } catch (e) { console.error(e); }
      finally { setSearching(false); }
    }, 500);
    return () => clearTimeout(id);
  }, [search]);

  const sorted = [...tokens].sort((a, b) => {
    if (sort === "score")  return b.score - a.score;
    if (sort === "volume") return (b.volume24hUSD ?? 0) - (a.volume24hUSD ?? 0);
    if (sort === "change") return Math.abs(b.price24hChangePercent ?? 0) - Math.abs(a.price24hChangePercent ?? 0);
    return (a.rank ?? 99) - (b.rank ?? 99);
  });

  const visibleTokens = sorted.filter(t => {
    const mf = bFilter === "all" || t.label === bFilter;
    const ms = !search || t.symbol?.toLowerCase().includes(search.toLowerCase()) || t.name?.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  const counts = { safe: tokens.filter(t => t.label==="safe").length, caution: tokens.filter(t => t.label==="caution").length, danger: tokens.filter(t => t.label==="danger").length };
  const showSearch = search.trim().length > 0;
  const isBirdeye  = tab === "trending";

  const handleTabChange = (t: Tab) => { setTab(t); setSearch(""); setDexFilter("all"); };
  const handleDexFilter = (f: string) => { setDexFilter(f); fetchDex(tab, f); };

  const fmt = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(1)}K` : `$${n.toFixed(0)}`;

  return (
    <>
    <div style={{ width: "100%", height: "clamp(120px, 25vw, 220px)", overflow: "hidden" }}>
      <img src="/banner.jpeg" alt="banner" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center", display: "block" }} />
    </div>
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 12px", fontFamily: "-apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif" }}>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16, paddingBottom: 16, borderBottom: "0.5px solid #D3D1C7",
        flexWrap: "wrap", gap: 10,
      }}>
        {/* Left — brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/favicon.jpg" alt="logo" style={{
            width: 36, height: 36, borderRadius: 10, objectFit: "cover", flexShrink: 0,
          }} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "#2c2c2a", letterSpacing: "-0.3px" }}>
              Solana Token Intel
            </div>
            <div style={{ fontSize: 12, color: "#888780", marginTop: 1, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: refreshing ? "#185FA5" : "#639922", display: "inline-block", animation: refreshing ? "pulse 1s infinite" : "none" }} />
              <span>{TAB_DESC[tab]}</span>
              {lastUpdated && <span style={{ color: "#B4B2A9" }}>· {lastUpdated.toLocaleTimeString()}</span>}
              {countdown > 0 && <span style={{ color: "#B4B2A9" }}>· {countdown}s</span>}
            </div>
          </div>
        </div>

        {/* Right — controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <span style={{ fontSize: 12, color: paused ? "#854F0B" : "#888780" }}>
              {paused ? "Paused" : "Live"}
            </span>
            <div onClick={() => setPaused(p => !p)} style={{
              width: 36, height: 20, borderRadius: 10, cursor: "pointer",
              background: paused ? "#D3D1C7" : "#185FA5",
              position: "relative", transition: "background 0.2s", flexShrink: 0,
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: "50%", background: "#ffffff",
                position: "absolute", top: 3,
                left: paused ? 3 : 19,
                transition: "left 0.2s",
              }} />
            </div>
          </label>
          <button
            onClick={() => setDarkMode(d => !d)}
            title="Toggle dark mode"
            style={{
              padding: "6px 12px", fontSize: 12, cursor: "pointer", borderRadius: 8,
              border: "0.5px solid #D3D1C7",
              background: darkMode ? "#2c2c2a" : "transparent",
              color: darkMode ? "#f0efe8" : "#888780",
            }}>
            {darkMode ? "☀" : "☾"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <input type="text" placeholder="Search any Solana token by name, symbol or address..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", fontSize: 14, padding: "10px 16px", border: "0.5px solid #D3D1C7",
            borderRadius: 10, outline: "none", background: "#ffffff", color: "#2c2c2a" }} />
        {searching && <div style={{ position: "absolute", right: 14, top: 11, fontSize: 12, color: "#888780" }}>Searching...</div>}
        {showSearch && searchResults.length > 0 && (
          <div style={{ position: "absolute", top: "110%", left: 0, right: 0, zIndex: 200,
            background: "#ffffff", border: "0.5px solid #D3D1C7", borderRadius: 10, overflow: "hidden", maxHeight: 380, overflowY: "auto" }}>
            {searchResults.map((pair: any, i: number) => (
              <div key={i} onClick={() => { setSelected({ ...pair, address: pair.baseToken?.address }); setSearch(""); setSearchResults([]); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "0.5px solid #F1EFE8", cursor: "pointer" }}
                className="search-row"
                onMouseEnter={e => (e.currentTarget.style.background = "#F1EFE8")}
                onMouseLeave={e => (e.currentTarget.style.background = "#ffffff")}>
                {pair.info?.imageUrl && <img src={pair.info.imageUrl} width={28} height={28} style={{ borderRadius: "50%" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#2c2c2a" }}>{pair.baseToken?.symbol} <span style={{ fontWeight: 400, color: "#888780" }}>/ {pair.quoteToken?.symbol}</span></div>
                  <div style={{ fontSize: 11, color: "#888780" }}>{pair.baseToken?.name} · {pair.dexId}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#2c2c2a" }}>${parseFloat(pair.priceUsd||"0").toFixed(6)}</div>
                  <div style={{ fontSize: 11, color: (pair.priceChange?.h24??0)>=0?"#3B6D11":"#A32D2D" }}>{(pair.priceChange?.h24??0)>=0?"▲":"▼"} {Math.abs(pair.priceChange?.h24??0).toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {ALL_TABS.map(t => (
          <button key={t} onClick={() => handleTabChange(t)} style={{
            padding: "7px 16px", fontSize: 13, cursor: "pointer", borderRadius: 8,
            border: tab === t ? "2px solid #185FA5" : "0.5px solid #D3D1C7",
            background: tab === t ? "#E6F1FB" : "transparent",
            color: tab === t ? "#0C447C" : "#888780", fontWeight: tab === t ? 500 : 400,
          }}>{TAB_LABELS[t]}</button>
        ))}
      </div>

      {/* Controls row */}
      {!showSearch && tab !== "watchlist" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 13, color: "#888780" }}>
            Showing <span style={{ fontWeight: 500, color: "#2c2c2a" }}>{isBirdeye ? visibleTokens.length : dexPairs.length}</span> tokens
            {totalPairs > 0 && ` of ${totalPairs.toLocaleString()}`}
            {tab === "whale" && totalTxns > 0 && <span style={{ marginLeft: 8 }}>· <span style={{ fontWeight: 500, color: "#2c2c2a" }}>{totalTxns.toLocaleString()}</span> whale txs · Total: <span style={{ fontWeight: 500, color: "#2c2c2a" }}>{fmt(totalVolume)}</span></span>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Whale / DeFi filter */}
            {(tab === "whale" || tab === "defi") && (
              <div style={{ display: "flex", border: "0.5px solid #D3D1C7", borderRadius: 8, overflow: "hidden" }}>
                {["all", "gainers", "losers"].map(f => (
                  <button key={f} onClick={() => handleDexFilter(f)} style={{
                    padding: "6px 14px", fontSize: 12, cursor: "pointer", border: "none",
                    background: dexFilter === f ? "#E6F1FB" : "transparent",
                    color: dexFilter === f ? "#0C447C" : "#888780", fontWeight: dexFilter === f ? 500 : 400, textTransform: "capitalize",
                  }}>{f === "all" ? (tab === "whale" ? "Whale feed" : "All") : f.charAt(0).toUpperCase() + f.slice(1)}</button>
                ))}
              </div>
            )}
            {isBirdeye && FILTERS_BIRDEYE.map(f => (
              <button key={f} onClick={() => setBFilter(f)} style={{
                padding: "6px 12px", fontSize: 12, cursor: "pointer", borderRadius: 8,
                border: bFilter === f ? "2px solid #185FA5" : "0.5px solid #D3D1C7",
                background: bFilter === f ? "#E6F1FB" : "transparent",
                color: bFilter === f ? "#0C447C" : "#888780", fontWeight: bFilter === f ? 500 : 400, textTransform: "capitalize",
              }}>{f}</button>
            ))}
            {isBirdeye && (
              <select value={sort} onChange={e => setSort(e.target.value as SortKey)} style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8, border: "0.5px solid #D3D1C7", background: "transparent", color: "#2c2c2a", cursor: "pointer" }}>
                <option value="rank">Trending rank</option>
                <option value="score">Risk score</option>
                <option value="volume">Volume</option>
                <option value="change">Price change</option>
              </select>
            )}
            <button onClick={() => doRefresh(false)} disabled={loading} style={{
              padding: "6px 14px", fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
              border: "0.5px solid #D3D1C7", borderRadius: 8,
              background: loading ? "#F1EFE8" : "transparent",
              color: loading ? "#B4B2A9" : "#2c2c2a", fontWeight: 500,
            }}>{loading ? "Loading..." : "↻ Refresh"}</button>
          </div>
        </div>
      )}

      {/* Trending stats */}
      {isBirdeye && !showSearch && !loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Safe tokens",    value: counts.safe,    bg: "#EAF3DE", color: "#3B6D11" },
            { label: "Caution tokens", value: counts.caution, bg: "#FAEEDA", color: "#854F0B" },
            { label: "Danger tokens",  value: counts.danger,  bg: "#FCEBEB", color: "#A32D2D" },
          ].map(({ label, value, bg, color }) => (
            <div key={label} style={{ background: bg, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, color, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 500, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {loading && dexPairs.length === 0 && tokens.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#888780", fontSize: 14 }}>Loading...</div>
      ) : showSearch ? (
        searchResults.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#888780", fontSize: 14 }}>{searching ? "Searching..." : "No results found."}</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {searchResults.map((pair: any, i: number) => {
              const addr = pair.baseToken?.address || "";
              return (
                <DexCard
                  key={i}
                  pair={pair}
                  onClick={() => setSelected({ ...pair, address: addr })}
                  starButton={
                    <button
                      onClick={(e) => { e.stopPropagation(); const token = { ...pair, address: addr, symbol: pair.baseToken?.symbol, name: pair.baseToken?.name, pairData: pair }; inWatchlist(addr) ? removeFromWatchlist(addr) : addToWatchlist(token); }}
                      style={{ fontSize: 14, color: inWatchlist(addr) ? "#BA7517" : "#B4B2A9", background: "transparent", border: "0.5px solid #D3D1C7", borderRadius: 6, padding: "3px 6px", cursor: "pointer" }}>
                      {inWatchlist(addr) ? "★" : "☆"}
                    </button>
                  }
                />
              );
            })}
          </div>
        )
      ) : tab === "watchlist" ? (
        <WatchlistTab onSelect={setSelected} />
      ) : tab === "whale" ? (
        <WhaleTab pairs={dexPairs} onSelect={setSelected} filter={dexFilter} />
      ) : tab === "meme" ? (
        <MemeTab onSelect={setSelected} paused={paused} />
      ) : tab === "smart" ? (
        <SmartTab pairs={dexPairs} onSelect={setSelected} />
      ) : isBirdeye ? (
        <div>
          {/* Trending sub-tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "0.5px solid #D3D1C7", paddingBottom: 12 }}>
            <button onClick={() => setTrendView("birdeye")} style={{
              padding: "6px 16px", fontSize: 13, cursor: "pointer", borderRadius: 8,
              border: trendView === "birdeye" ? "2px solid #185FA5" : "0.5px solid #D3D1C7",
              background: trendView === "birdeye" ? "#E6F1FB" : "transparent",
              color: trendView === "birdeye" ? "#0C447C" : "#888780", fontWeight: trendView === "birdeye" ? 500 : 400,
            }}>Risk scored · Birdeye</button>
            <button onClick={() => setTrendView("dex")} style={{
              padding: "6px 16px", fontSize: 13, cursor: "pointer", borderRadius: 8,
              border: trendView === "dex" ? "2px solid #185FA5" : "0.5px solid #D3D1C7",
              background: trendView === "dex" ? "#E6F1FB" : "transparent",
              color: trendView === "dex" ? "#0C447C" : "#888780", fontWeight: trendView === "dex" ? 500 : 400,
            }}>Gainers · Volume · Txns · Newest</button>
          </div>

          {trendView === "birdeye" ? (
            visibleTokens.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#888780", fontSize: 14 }}>No tokens match your filters.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                {visibleTokens.map(token => (
                  <DexCard
                    key={token.address}
                    pair={{ baseToken: { address: token.address, symbol: token.symbol, name: token.name }, priceUsd: String(token.price ?? 0), priceChange: { h24: token.price24hChangePercent }, volume: { h24: token.volume24hUSD }, liquidity: { usd: token.liquidity }, fdv: token.fdv ?? token.marketcap, txns: token.txns, pairCreatedAt: token.pairCreatedAt, dexId: token.dexId, info: token.info, score: token.score, label: token.label }}
                    onClick={() => setSelected(token)}
                    starButton={
                      <button
                        onClick={(e) => { e.stopPropagation(); inWatchlist(token.address) ? removeFromWatchlist(token.address) : addToWatchlist({ ...token, pairData: null }); }}
                        style={{ fontSize: 14, color: inWatchlist(token.address) ? "#BA7517" : "#B4B2A9", background: "transparent", border: "0.5px solid #D3D1C7", borderRadius: 6, padding: "3px 6px", cursor: "pointer" }}>
                        {inWatchlist(token.address) ? "★" : "☆"}
                      </button>
                    }
                  />
                ))}
              </div>
            )
          ) : (
            <TrendingDexTab onSelect={setSelected} />
          )}
        </div>
      ) : (
        dexPairs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#888780", fontSize: 14 }}>No data available.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {dexPairs.map((pair: any, i: number) => {
              const addr = pair.baseToken?.address || pair.tokenAddress || "";
              return (
                <DexCard
                  key={i}
                  pair={pair}
                  onClick={() => setSelected({ ...pair, address: addr })}
                  starButton={
                    <button
                      onClick={(e) => { e.stopPropagation(); const token = { ...pair, address: addr, symbol: pair.baseToken?.symbol, name: pair.baseToken?.name, pairData: pair }; inWatchlist(addr) ? removeFromWatchlist(addr) : addToWatchlist(token); }}
                      style={{ fontSize: 14, color: inWatchlist(addr) ? "#BA7517" : "#B4B2A9", background: "transparent", border: "0.5px solid #D3D1C7", borderRadius: 6, padding: "3px 6px", cursor: "pointer" }}>
                      {inWatchlist(addr) ? "★" : "☆"}
                    </button>
                  }
                />
              );
            })}
          </div>
        )
      )}

      {/* Footer */}
      <footer style={{
        marginTop: 60, borderTop: "0.5px solid #D3D1C7", paddingTop: 32,
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 32,
      }}>
        {/* Brand */}
        <div>
          <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 8 }}>Solana Token Intel</div>
          <div style={{ fontSize: 12, color: "#888780", lineHeight: 1.7 }}>
            Real-time Solana token safety scoring and market intelligence powered by Birdeye Data.
          </div>
        </div>

        {/* Features */}
        <div>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10 }}>Features</div>
          {["Trending tokens","Live feed","Whale radar","Meme monitor","Smart money","DeFi pulse","Token search","Risk scoring","Price charts"].map(item => (
            <div key={item} style={{ fontSize: 12, color: "#888780", marginBottom: 6 }}>{item}</div>
          ))}
        </div>

        {/* Data */}
        <div>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10 }}>Data</div>
          {[
            { label: "Birdeye Data",    url: "https://birdeye.so" },
            { label: "Birdeye API Docs",url: "https://docs.birdeye.so" },
            { label: "Birdeye Discord", url: "https://discord.gg/tbKbCmU5fM" },
          ].map(({ label, url }) => (
            <div key={label} style={{ marginBottom: 6 }}>
              <a href={url} target="_blank" style={{ fontSize: 12, color: "#185FA5", textDecoration: "none" }}>{label}</a>
            </div>
          ))}
        </div>

        {/* Links */}
        <div>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10 }}>Links</div>
          <a href="https://bds.birdeye.so" target="_blank"
            style={{ fontSize: 12, color: "#185FA5", textDecoration: "none", display: "block", marginBottom: 6 }}>
            Get API key →
          </a>
          <a href="https://discord.gg/tbKbCmU5fM" target="_blank"
            style={{ fontSize: 12, color: "#185FA5", textDecoration: "none", display: "block", marginBottom: 6 }}>
            Join Discord →
          </a>
          <a href="https://x.com/levr_nx" target="_blank"
            style={{ fontSize: 12, color: "#185FA5", textDecoration: "none", display: "block" }}>
            Follow on X →
          </a>
        </div>
      </footer>

      {/* Bottom bar */}
      <div style={{
        marginTop: 24, paddingBottom: 24,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8, fontSize: 11, color: "#B4B2A9",
      }}>
        <div>© 2026 Solana Token Intel · Powered by Birdeye Data</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span>Not financial advice</span>
          <span>Data may be delayed</span>
          <a href="https://birdeye.so" target="_blank" style={{ color: "#185FA5", textDecoration: "none" }}>Birdeye.so</a>
          <a href="https://x.com/levr_nx" target="_blank" style={{ textDecoration: "none" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: "50%",
              background: "linear-gradient(135deg, #1DA1F2, #7B2FBE, #E1306C)",
              fontSize: 13, fontWeight: 700, color: "#ffffff",
              animation: "xglow 2s ease-in-out infinite",
            }}>𝕏</span>
          </a>
        </div>
      </div>

      <style>{`
        @keyframes xglow {
          0%, 100% { box-shadow: 0 0 8px rgba(29,161,242,0.8), 0 0 16px rgba(123,47,190,0.5), 0 0 24px rgba(225,48,108,0.3); }
          33%       { box-shadow: 0 0 8px rgba(225,48,108,0.8), 0 0 16px rgba(29,161,242,0.5), 0 0 24px rgba(123,47,190,0.3); }
          66%       { box-shadow: 0 0 8px rgba(123,47,190,0.8), 0 0 16px rgba(225,48,108,0.5), 0 0 24px rgba(29,161,242,0.3); }
        }
      `}</style>
      {selected && <TokenModal token={selected} onClose={() => setSelected(null)} />}


    </main>
    </>
  );
}
