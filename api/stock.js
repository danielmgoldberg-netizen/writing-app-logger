export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const ticker = String(req.query.ticker || "PEP").trim().toUpperCase();

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1wk&range=1y`,
      // Yahoo rejects requests without a browser-like User-Agent
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    if (!response.ok || !result) {
      throw new Error(json?.chart?.error?.description || `Yahoo Finance request failed (${response.status})`);
    }

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    const data = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        close: closes[i] == null ? null : Math.round(closes[i] * 100) / 100
      }))
      .filter(point => point.close !== null);

    return res.status(200).json({ ticker, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
