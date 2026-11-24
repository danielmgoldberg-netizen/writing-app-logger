// Shared logic for /api/log and /api/log-a2.
// (Files starting with "_" in /api are not exposed as endpoints by Vercel.)
//
// WHERE RECORDS GO is controlled by Vercel environment variables, so switching
// or rolling back needs no code change, only an env edit + redeploy:
//
//   LOG_TARGET          "airtable" (default) | "sheets" | "both"
//   SHEETS_WEBHOOK_URL  the Apps Script web app URL (ends in /exec)
//   SHEETS_SECRET       shared secret, must match SECRET in the Apps Script
//
// In "sheets" mode, if the Sheet write fails the record falls back to Airtable,
// so a broken Sheet never loses a student session.
// ROLLBACK: set LOG_TARGET=airtable (or delete it) and redeploy.

const FIELDS = ["Student Name", "Teacher", "Timestamp", "App", "Text Title", "Attempts", "Score", "Max Score"];

async function writeAirtable({ token, baseId, tableId }, record) {
  if (!token || !baseId || !tableId) throw new Error("Airtable not configured");
  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ records: [{ fields: record }] })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Airtable ${response.status}: ${JSON.stringify(data).slice(0, 200)}`);
  }
}

async function writeSheets(record) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  const secret = process.env.SHEETS_SECRET;
  if (!url || !secret) throw new Error("Sheets not configured");
  // Apps Script answers POST with a redirect to the result; fetch follows it.
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ secret, record }),
    redirect: "follow"
  });
  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text); } catch (e) { /* HTML error page */ }
  if (!response.ok || !data.ok) throw new Error(`Sheets: ${data.error || text.slice(0, 200)}`);
}

export function makeLogHandler({ baseEnv, tableEnv, submissionMax }) {
  return async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    const airtable = {
      token:   process.env.AIRTABLE_TOKEN,
      baseId:  process.env[baseEnv],
      tableId: process.env[tableEnv]
    };
    const target = (process.env.LOG_TARGET || "airtable").trim().toLowerCase();

    // GET: health check only. Never writes anywhere, so browser or bot visits
    // cost nothing. Shows which target is active.
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        target,
        airtableConfigured: Boolean(airtable.token && airtable.baseId && airtable.tableId),
        sheetsConfigured: Boolean(process.env.SHEETS_WEBHOOK_URL && process.env.SHEETS_SECRET)
      });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
      // Apps send text/plain (no CORS preflight); older clients send JSON.
      let fields = req.body;
      if (typeof fields === "string") fields = JSON.parse(fields || "{}");
      fields = fields || {};

      const attempts = Number(fields["Attempts"] || 0);
      // Nothing worth storing: skip without writing anywhere.
      if (!fields["Student Name"] || attempts < 1) {
        return res.status(200).json({ ok: true, skipped: true });
      }

      const record = {
        "Student Name": String(fields["Student Name"]),
        "Teacher":      String(fields["Teacher"]    || ""),
        "Timestamp":    String(fields["Timestamp"]  || new Date().toISOString()),
        "App":          String(fields["App"]        || ""),
        "Text Title":   String(fields["Text Title"] || ""),
        "Attempts":     attempts,
        "Score":        Number(fields["Score"]      || 0),
        "Max Score":    Number(fields["Max Score"]  || 0)
      };
      // Only older app versions still send the text itself.
      if (fields["Submission"]) record["Submission"] = String(fields["Submission"]).slice(0, submissionMax);

      const written = [];
      if (target === "sheets") {
        try {
          await writeSheets(record);
          written.push("sheets");
        } catch (e) {
          console.error("Sheets write failed, falling back to Airtable:", e.message);
          await writeAirtable(airtable, record);
          written.push("airtable-fallback");
        }
      } else if (target === "both") {
        const results = await Promise.allSettled([writeSheets(record), writeAirtable(airtable, record)]);
        if (results[0].status === "fulfilled") written.push("sheets");
        else console.error("Sheets write failed:", results[0].reason && results[0].reason.message);
        if (results[1].status === "fulfilled") written.push("airtable");
        else console.error("Airtable write failed:", results[1].reason && results[1].reason.message);
        if (!written.length) throw new Error("Both Sheets and Airtable writes failed");
      } else {
        await writeAirtable(airtable, record);
        written.push("airtable");
      }
      return res.status(200).json({ ok: true, written });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
}

export { FIELDS };
