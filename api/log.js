// Main Idea + Opinion Writing (Pre-Basic / A1-A2). One record per session.
// Destination (Airtable / Google Sheet) is set by LOG_TARGET; see _logHandler.js.
import { makeLogHandler } from "./_logHandler.js";

export default makeLogHandler({
  baseEnv: "AIRTABLE_BASE_ID",
  tableEnv: "AIRTABLE_TABLE_ID",
  submissionMax: 500
});
