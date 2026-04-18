const BASE_URL = "https://public-api.birdeye.so";
const API_KEY = process.env.BIRDEYE_API_KEY!;

export const headers = {
  "X-API-KEY": API_KEY,
  "x-chain": "solana",
};

export async function getTrendingTokens() {
  const res = await fetch(`${BASE_URL}/defi/token_trending?limit=20`, {
    headers,
    cache: "no-store", // always fetch fresh data
  });
  if (!res.ok) throw new Error(`Trending failed: ${res.status}`);
  return res.json();
}

export async function getOHLCV(address: string) {
  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 86400;
  const res = await fetch(
    `${BASE_URL}/defi/ohlcv?address=${address}&type=1H&time_from=${oneDayAgo}&time_to=${now}`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`OHLCV failed: ${res.status}`);
  return res.json();
}

export function calcRiskScoreFromToken(token: any): number {
  let score = 100;

  const liq = token.liquidity ?? 0;
  if (liq < 10_000)       score -= 40;
  else if (liq < 50_000)  score -= 25;
  else if (liq < 100_000) score -= 10;

  const priceChange = Math.abs(token.price24hChangePercent ?? 0);
  if (priceChange > 1000)      score -= 35;
  else if (priceChange > 500)  score -= 25;
  else if (priceChange > 200)  score -= 15;
  else if (priceChange > 100)  score -= 8;
  else if (priceChange > 50)   score -= 3;

  const volChange = Math.abs(token.volume24hChangePercent ?? 0);
  if (volChange > 100_000)     score -= 20;
  else if (volChange > 10_000) score -= 12;
  else if (volChange > 1_000)  score -= 6;

  const mc = token.marketcap ?? token.fdv ?? 0;
  if (mc > 0 && mc < 100_000)  score -= 20;
  else if (mc < 500_000)        score -= 10;
  else if (mc < 1_000_000)      score -= 5;

  return Math.max(0, Math.min(100, score));
}

export function riskLabel(score: number): "safe" | "caution" | "danger" {
  if (score >= 70) return "safe";
  if (score >= 40) return "caution";
  return "danger";
}
