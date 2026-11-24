/**
 * Writing Apps session log: receives one record per student session from the
 * Vercel logger (writing-app-logger) and appends it to a Google Sheet.
 *
 * SETTINGS live in Project Settings > Script Properties (no code edits needed):
 *   SHEET_ID  the ID of the target spreadsheet (the long code in its URL,
 *             between /d/ and /edit). To point at a different file, change
 *             this value. Moving the file to another Drive folder needs NO
 *             change: the ID stays the same.
 *   SECRET    must match SHEETS_SECRET in Vercel. Requests without it are refused.
 *
 * Deploy: Deploy > New deployment > Web app, Execute as: Me,
 *         Who has access: Anyone. Copy the /exec URL into Vercel.
 * When you change this code later: Deploy > Manage deployments > edit (pencil)
 *         > Version: New version. That keeps the SAME /exec URL.
 */

// Which tab each app writes to. Tabs are created (with headers) if missing.
const TAB_FOR_APP = {
  "main-idea":    "Pre-Basic",
  "opinion":      "Pre-Basic",
  "a2-economics": "A2 Economics",
  "a2-business":  "A2 Business"
};
const DEFAULT_TAB = "Other";

const HEADERS = ["Student Name", "Teacher", "Timestamp", "App", "Text Title",
                 "Attempts", "Score", "Max Score", "Submission"];

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (!body.secret || body.secret !== props.getProperty("SECRET")) {
      return reply({ ok: false, error: "unauthorized" });
    }
    const record = body.record || {};
    if (!record["Student Name"] || !(Number(record["Attempts"]) >= 1)) {
      return reply({ ok: true, skipped: true });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(20000); // avoid two sessions writing to the same row
    try {
      const ss = SpreadsheetApp.openById(props.getProperty("SHEET_ID"));
      const tabName = TAB_FOR_APP[record["App"]] || DEFAULT_TAB;
      let sheet = ss.getSheetByName(tabName);
      if (!sheet) {
        sheet = ss.insertSheet(tabName);
        sheet.appendRow(HEADERS);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      }
      // A leading apostrophe stops Sheets treating a student's name as a formula.
      sheet.appendRow(HEADERS.map(h => {
        const v = record[h];
        if (v === undefined || v === null) return "";
        if (typeof v === "string" && /^[=+\-@]/.test(v)) return "'" + v;
        return v;
      }));
    } finally {
      lock.releaseLock();
    }
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err && err.message || err) });
  }
}

// Opening the /exec URL in a browser: a harmless check that writes nothing.
function doGet() {
  const props = PropertiesService.getScriptProperties();
  let sheetName = null;
  try { sheetName = SpreadsheetApp.openById(props.getProperty("SHEET_ID")).getName(); } catch (e) {}
  return reply({ ok: true, sheet: sheetName, secretSet: Boolean(props.getProperty("SECRET")) });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor (select testWrite > Run) to check the setup. */
function testWrite() {
  const props = PropertiesService.getScriptProperties();
  const out = doPost({ postData: { contents: JSON.stringify({
    secret: props.getProperty("SECRET"),
    record: { "Student Name": "SETUP TEST", "Teacher": "Daniel", "Timestamp": new Date().toISOString(),
              "App": "main-idea", "Text Title": "Setup test", "Attempts": 1, "Score": 5, "Max Score": 5 }
  }) } });
  Logger.log(out.getContent());
}
