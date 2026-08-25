export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const AIRTABLE_TOKEN    = process.env.AIRTABLE_TOKEN;
    const AIRTABLE_BASE_ID  = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;

    // GET: quick connection test
    const isTest = req.method === "GET";
    const record = isTest ? {
      "Student Name": "CONNECTION TEST",
      "Submission":   "Test sentence."
    } : (() => {
      let fields = req.body;
      if (typeof fields === "string") fields = JSON.parse(fields);
      return {
        "Student Name": String(fields["Student Name"] || ""),
        "Teacher":      String(fields["Teacher"]      || ""),
        "Timestamp":    String(fields["Timestamp"]    || ""),
        "App":          String(fields["App"]          || ""),
        "Text Title":   String(fields["Text Title"]   || ""),
        "Attempts":     Number(fields["Attempts"]     || 0),
        "Submission":   String(fields["Submission"]   || ""),
        "Score":        Number(fields["Score"]        || 0),
        "Max Score":    Number(fields["Max Score"]    || 0)
      };
    })();

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ records: [{ fields: record }] })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data, sentRecord: record });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
