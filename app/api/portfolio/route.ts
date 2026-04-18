import { calcRiskScoreFromToken, riskLabel } from "@/lib/birdeye";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) return Response.json({ error: "wallet required" }, { status: 400 });

  try {
    const API_KEY = process.env.BIRDEYE_API_KEY!;

    // Fetch wallet token holdings from Birdeye
    const res = await fetch(
      `https://public-api.birdeye.so/v1/wallet/token_list?wallet=${wallet}`,
      { headers: { "X-API-KEY": API_KEY, "x-chain": "solana" } }
    );

    if (!res.ok) {
      // Fallback: use DexScreener to look up the wallet
      return Response.json({ success: true, data: [], error: "Wallet lookup requires Birdeye premium. Try a known wallet." });
    }

    const json = await res.json();
    const items = json.data?.items || [];

    const tokens = items
      .filter((item: any) => item.uiAmount > 0)
      .map((item: any) => {
        const score = calcRiskScoreFromToken({
          liquidity: item.liquidity ?? 0,
          price24hChangePercent: item.priceChange24h ?? 0,
          volume24hChangePercent: 0,
          marketcap: item.marketcap ?? 0,
        });
        return {
          address:  item.address,
          symbol:   item.symbol,
          name:     item.name,
          logoURI:  item.logoURI,
          price:    item.priceUsd ?? 0,
          amount:   item.uiAmount,
          valueUsd: (item.uiAmount ?? 0) * (item.priceUsd ?? 0),
          score,
          label: riskLabel(score),
        };
      })
      .sort((a: any, b: any) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));

    return Response.json({ success: true, data: tokens });

  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
