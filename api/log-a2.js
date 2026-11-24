// A2 Economics + A2 Business (PepsiCo). One record per session.
// Destination (Airtable / Google Sheet) is set by LOG_TARGET; see _logHandler.js.
import { makeLogHandler } from "./_logHandler.js";

export default makeLogHandler({
  baseEnv: "AIRTABLE_BASE_ID_A2",
  tableEnv: "AIRTABLE_TABLE_ID_A2_BUSINESS",
  submissionMax: 2000
});
