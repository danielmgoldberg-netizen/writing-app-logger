export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const AIRTABLE_TOKEN   = process.env.AIRTABLE_TOKEN;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ records: [{ fields: req.body }] })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
