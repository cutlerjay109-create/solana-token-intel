"use client";

import { useEffect, useState, useRef } from "react";
import DexCard from "./DexCard";

type MemeFilter = "all" | "new" | "hot";

export default function MemeTab({ onSelect, paused = false, dark = false }: { onSelect: (p: any) => void; paused?: boolean; dark?: boolean }) {
  const bg     = dark ? "#1e1e1c" : "#ffffff";
  const bg2    = dark ? "#2a2a28" : "#F1EFE8";
  const border = dark ? "#3a3a38" : "#D3D1C7";
  const text   = dark ? "#e8e6df" : "#2c2c2a";
  const text2  = dark ? "#9c9a92" : "#888780";
  const text3  = dark ? "#6a6a68" : "#B4B2A9";
  const blue   = dark ? "#5ba3e8" : "#185FA5";
  const blueBg = dark ? "#0f2035" : "#E6F1FB";
  const green  = dark ? "#7bc96f" : "#3B6D11";
  const amber  = dark ? "#e8a44a" : "#854F0B";
  const amberBg= dark ? "#2e2210" : "#FAEEDA";
  const red    = dark ? "#f47c7c" : "#A32D2D";
  const [pairs, setPairs]         = useState<any[]>([]);
  const [filter, setFilter]       = useState<MemeFilter>("all");
  const [loading, setLoading]     = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [total, setTotal]         = useState(0);
  const intervalRef  = useRef<any>(null);
  const countRef     = useRef<any>(null);
  const filterRef    = useRef<MemeFilter>("all");
  const fetchingRef  = useRef(false);

  const [refreshing, setRefreshing] = useState(false);

  const doFetch = async (f: MemeFilter, background = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/dexscreener?type=meme&filter=${f}&t=${Date.now()}`);
      const json = await res.json();
      setPairs(json.data || []);
      setTotal(json.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); fetchingRef.current = false; }
  };

  useEffect(() => {
    filterRef.current = filter;
    doFetch(filter);
    setCountdown(30);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countRef.current)    clearInterval(countRef.current);
    intervalRef.current = setInterval(() => { if (!paused) { doFetch(filterRef.current, true); setCountdown(30); } }, 30_000);
    countRef.current    = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000);
    return () => { clearInterval(intervalRef.current); clearInterval(countRef.current); };
  }, [filter]);

  const handleFilter = (f: MemeFilter) => setFilter(f);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "new", "hot"] as MemeFilter[]).map(f => (
            <button key={f} onClick={() => handleFilter(f)} style={{
              padding: "7px 18px", fontSize: 13, cursor: "pointer", borderRadius: 8,
              border: filter === f ? "2px solid #185FA5" : "0.5px solid #D3D1C7",
              background: filter === f ? "#E6F1FB" : "transparent",
              color: filter === f ? "#0C447C" : "#888780",
              fontWeight: filter === f ? 500 : 400, textTransform: "capitalize",
            }}>{f === "all" ? "All" : f === "new" ? "New" : "Hot"}</button>
          ))}
        </div>
        <div style={{ fontSize: 13, color: "#888780" }}>
          <span style={{ color: text3 }}>Refreshes in {countdown}s</span>
          {refreshing && <span style={{ marginLeft: 6, fontSize: 11, color: "#185FA5" }}>● updating</span>}
        </div>
      </div>

      {loading && pairs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#888780", fontSize: 14 }}>Loading...</div>
      ) : pairs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#888780", fontSize: 14 }}>No meme tokens found.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {pairs.map((pair: any, i: number) => (
            <DexCard dark={dark} key={i} pair={pair} onClick={() => onSelect({ ...pair, address: pair.baseToken?.address })} />
          ))}
        </div>
      )}
    </div>
  );
}
