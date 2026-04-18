import { calcRiskScoreFromToken, riskLabel } from "@/lib/birdeye";
export const dynamic = "force-dynamic";

const BASE = "https://api.dexscreener.com";

function scorePair(pair: any) {
  const token = {
    liquidity:              pair.liquidity?.usd          ?? 0,
    price24hChangePercent:  pair.priceChange?.h24         ?? 0,
    volume24hChangePercent: pair.volume?.h24 && pair.volume?.h6
      ? ((pair.volume.h1 ?? 0) / (pair.volume.h24 / 24) - 1) * 100
      : 0,
    marketcap: pair.fdv ?? pair.marketCap ?? 0,
  };
  const score = calcRiskScoreFromToken(token);
  return { ...pair, score, label: riskLabel(score) };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "search";
  const q = searchParams.get("q") || "";
  const address = searchParams.get("address") || "";
  const addresses = searchParams.get("addresses") || "";
  const filter = searchParams.get("filter") || "all";

  try {
    if (type === "search" && q) {
      const res = await fetch(`${BASE}/latest/dex/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      const pairs = (json.pairs || []).filter((p: any) => p.chainId === "solana").slice(0, 20).map(scorePair);
      return Response.json({ success: true, data: pairs });
    }

    // Trending with time period + mode (gainers, volume, txns, newest)
    if (type === "trending_dex") {
      const period = searchParams.get("period") || "h24"; // m5, h1, h6, h24
      const mode   = searchParams.get("mode")   || "gainers"; // gainers, volume, txns, newest

      const trendQueries = ["SOL", "pump", "BONK", "WIF", "JUP", "MEME", "RAY"];
      const idx = Math.floor(Date.now() / 30_000) % trendQueries.length;

      const [r1, r2] = await Promise.all([
        fetch(`${BASE}/latest/dex/search?q=${trendQueries[idx]}`),
        fetch(`${BASE}/latest/dex/search?q=${trendQueries[(idx+1) % trendQueries.length]}`),
      ]);
      const [j1, j2] = await Promise.all([r1.json(), r2.json()]);

      let pairs = [...(j1.pairs||[]), ...(j2.pairs||[])]
        .filter((p: any) => p.chainId === "solana")
        .filter((p: any, i: number, arr: any[]) => arr.findIndex(x => x.pairAddress === p.pairAddress) === i)
        .filter((p: any) => (p.liquidity?.usd ?? 0) > 1000)
        .map(scorePair);

      if (mode === "gainers") {
        // Don't filter out tokens — just sort by price change for the period
        // Some tokens may have 0 for short periods like m5, that's fine
        pairs = pairs
          .sort((a: any, b: any) => (b.priceChange?.[period] ?? 0) - (a.priceChange?.[period] ?? 0));
      } else if (mode === "volume") {
        pairs = pairs.sort((a: any, b: any) => (b.volume?.[period] ?? 0) - (a.volume?.[period] ?? 0));
      } else if (mode === "txns") {
        pairs = pairs.sort((a: any, b: any) => {
          const bT = (b.txns?.[period]?.buys ?? 0) + (b.txns?.[period]?.sells ?? 0);
          const aT = (a.txns?.[period]?.buys ?? 0) + (a.txns?.[period]?.sells ?? 0);
          return bT - aT;
        });
      } else if (mode === "newest") {
        const now = Date.now();
        const windows: Record<string, number> = {
          m5:  5  * 60 * 1000,
          h1:  1  * 60 * 60 * 1000,
          h6:  6  * 60 * 60 * 1000,
          h24: 24 * 60 * 60 * 1000,
          d3:  3  * 24 * 60 * 60 * 1000,
          d7:  7  * 24 * 60 * 60 * 1000,
        };
        const window = windows[period] ?? windows.h24;
        pairs = pairs
          .filter((p: any) => p.pairCreatedAt && (now - p.pairCreatedAt) <= window)
          .sort((a: any, b: any) => (b.pairCreatedAt ?? 0) - (a.pairCreatedAt ?? 0));
      }

      return Response.json({ success: true, data: pairs.slice(0, 50), total: pairs.length });
    }

    if (type === "token" && address) {
      const res = await fetch(`${BASE}/tokens/v1/solana/${address}`);
      const json = await res.json();
      return Response.json({ success: true, data: Array.isArray(json) ? json[0] : null });
    }

    if (type === "batch" && addresses) {
      const list = addresses.split(",").slice(0, 30);
      const results: Record<string, any> = {};
      await Promise.all(list.map(async (addr) => {
        try {
          const res = await fetch(`${BASE}/tokens/v1/solana/${addr}`);
          const json = await res.json();
          const pair = Array.isArray(json) ? json[0] : null;
          if (pair) results[addr] = scorePair(pair);
        } catch {}
      }));
      return Response.json({ success: true, data: results });
    }

    if (type === "live") {
      const res = await fetch(`${BASE}/token-profiles/latest/v1`);
      const json = await res.json();
      const solana = (Array.isArray(json) ? json : []).filter((t: any) => t.chainId === "solana").slice(0, 40);
      const enriched = await Promise.all(solana.map(async (t: any) => {
        try {
          const r = await fetch(`${BASE}/tokens/v1/solana/${t.tokenAddress}`);
          const j = await r.json();
          const pair = Array.isArray(j) ? j[0] : null;
          return pair ? scorePair({ ...pair, ...t, tokenAddress: t.tokenAddress }) : t;
        } catch { return t; }
      }));
      return Response.json({ success: true, data: enriched });
    }

    if (type === "smart") {
      const res = await fetch(`${BASE}/token-boosts/top/v1`);
      const json = await res.json();
      const solana = (Array.isArray(json) ? json : []).filter((t: any) => t.chainId === "solana").slice(0, 30);
      const enriched = await Promise.all(solana.map(async (t: any) => {
        try {
          const r = await fetch(`${BASE}/tokens/v1/solana/${t.tokenAddress}`);
          const j = await r.json();
          const pair = Array.isArray(j) ? j[0] : null;
          return pair ? scorePair({ ...pair, ...t, tokenAddress: t.tokenAddress }) : t;
        } catch { return t; }
      }));
      // Sort by buys h24 descending to simulate smart money flow
      enriched.sort((a: any, b: any) => (b.txns?.h24?.buys ?? 0) - (a.txns?.h24?.buys ?? 0));
      return Response.json({ success: true, data: enriched });
    }

    if (type === "whale") {
      // Rotate queries every ~20s to simulate live feed variety
      const whaleQueries = ["SOL", "USDC", "BONK", "JUP", "RAY", "WIF", "POPCAT", "MEME", "PYTH", "RENDER"];
      const idx = Math.floor(Date.now() / 20_000) % whaleQueries.length;
      const q = filter === "gainers" ? "pump" : filter === "losers" ? "USDT" : whaleQueries[idx];

      const [r1, r2] = await Promise.all([
        fetch(`${BASE}/latest/dex/search?q=${q}`),
        fetch(`${BASE}/latest/dex/search?q=${whaleQueries[(idx + 1) % whaleQueries.length]}`),
      ]);
      const [j1, j2] = await Promise.all([r1.json(), r2.json()]);

      let pairs = [
        ...(j1.pairs || []),
        ...(j2.pairs || []),
      ].filter((p: any) => p.chainId === "solana")
       .filter((p: any, i: number, arr: any[]) => arr.findIndex(x => x.pairAddress === p.pairAddress) === i)
       .map(scorePair);

      if (filter === "gainers") {
        pairs = pairs.sort((a: any, b: any) => (b.priceChange?.h24 ?? 0) - (a.priceChange?.h24 ?? 0));
      } else if (filter === "losers") {
        pairs = pairs.sort((a: any, b: any) => (a.priceChange?.h24 ?? 0) - (b.priceChange?.h24 ?? 0));
      } else {
        // Mix high volume + recent activity for variety
        pairs = pairs.sort((a: any, b: any) => {
          const aScore = (b.txns?.h1?.buys ?? 0) + (b.txns?.h1?.sells ?? 0);
          const bScore = (a.txns?.h1?.buys ?? 0) + (a.txns?.h1?.sells ?? 0);
          return aScore - bScore;
        });
      }

      pairs = pairs.slice(0, 40);
      const totalVolume = pairs.reduce((s: number, p: any) => s + (p.volume?.h24 ?? 0), 0);
      const totalTxns   = pairs.reduce((s: number, p: any) => s + (p.txns?.h24?.buys ?? 0) + (p.txns?.h24?.sells ?? 0), 0);
      return Response.json({ success: true, data: pairs, totalVolume, totalTxns });
    }

    if (type === "meme") {
      const res = await fetch(`${BASE}/latest/dex/search?q=meme`);
      const json = await res.json();
      let pairs = (json.pairs || []).filter((p: any) => p.chainId === "solana" && (p.fdv ?? 0) < 10_000_000).map(scorePair);
      const now = Date.now();

      if (filter === "new") {
        pairs = pairs
          .filter((p: any) => p.pairCreatedAt && (now - p.pairCreatedAt) < 24 * 60 * 60 * 1000)
          .sort((a: any, b: any) => (b.pairCreatedAt ?? 0) - (a.pairCreatedAt ?? 0));
      } else if (filter === "hot") {
        pairs = pairs.sort((a: any, b: any) =>
          ((b.txns?.h1?.buys ?? 0) + (b.txns?.h1?.sells ?? 0)) -
          ((a.txns?.h1?.buys ?? 0) + (a.txns?.h1?.sells ?? 0)));
      } else {
        pairs = pairs.sort((a: any, b: any) => (b.priceChange?.h24 ?? 0) - (a.priceChange?.h24 ?? 0));
      }

      return Response.json({ success: true, data: pairs.slice(0, 60), total: pairs.length });
    }

    if (type === "defi") {
      // Fetch from multiple DeFi-relevant queries in parallel
      const defiQueries = ["SOL", "JUP", "RAY", "ORCA", "MSOL", "JITO", "PYTH", "WIF"];
      const idx = Math.floor(Date.now() / 30_000) % 4;
      const batch = defiQueries.slice(idx * 2, idx * 2 + 4);

      const responses = await Promise.all(
        batch.map(q => fetch(`${BASE}/latest/dex/search?q=${q}`).then(r => r.json()).catch(() => ({ pairs: [] })))
      );

      let pairs = responses
        .flatMap((j: any) => j.pairs || [])
        .filter((p: any) => p.chainId === "solana")
        .filter((p: any) => (p.liquidity?.usd ?? 0) > 10_000)
        .filter((p: any, i: number, arr: any[]) => arr.findIndex(x => x.pairAddress === p.pairAddress) === i)
       .map(scorePair);

      if (filter === "gainers") {
        pairs = pairs
          .filter((p: any) => (p.priceChange?.h24 ?? 0) > 0)
          .sort((a: any, b: any) => (b.priceChange?.h24 ?? 0) - (a.priceChange?.h24 ?? 0));
      } else if (filter === "losers") {
        pairs = pairs
          .filter((p: any) => (p.priceChange?.h24 ?? 0) < 0)
          .sort((a: any, b: any) => (a.priceChange?.h24 ?? 0) - (b.priceChange?.h24 ?? 0));
      } else {
        pairs = pairs.sort((a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
      }

      return Response.json({ success: true, data: pairs.slice(0, 40), total: pairs.length });
    }

    return Response.json({ error: "invalid type" }, { status: 400 });

  } catch (err: any) {
    console.error("[dexscreener route]", err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
