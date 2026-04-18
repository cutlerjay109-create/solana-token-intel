import { getTrendingTokens, getOHLCV, calcRiskScoreFromToken, riskLabel } from "@/lib/birdeye";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "trending";

  try {
    if (type === "ohlcv") {
      const address = searchParams.get("address");
      if (!address) return Response.json({ error: "address required" }, { status: 400 });
      const data = await getOHLCV(address);
      return Response.json({ success: true, data: data.data?.items || [] });
    }

    const data = await getTrendingTokens();
    const tokens = data.data?.tokens || data.data?.items || [];

    const enriched = tokens.map((token: any) => {
      const score = calcRiskScoreFromToken(token);
      const label = riskLabel(score);
      return { ...token, score, label };
    });

    return Response.json({ success: true, data: enriched });

  } catch (err: any) {
    console.error("[birdeye route]", err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
