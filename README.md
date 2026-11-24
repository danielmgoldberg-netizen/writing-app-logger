# writing-app-logger
Logs the Trom Besisi writing activity

## Where session records go (Airtable or Google Sheet)

Both `/api/log` (Pre-Basic: Main Idea, Opinion) and `/api/log-a2` (A2 Economics, A2 Business) write
ONE record per student session. The destination is set with Vercel environment variables
(Settings > Environment Variables, then redeploy):

| Variable | Values |
|---|---|
| `LOG_TARGET` | `airtable` (default if missing), `sheets`, or `both` |
| `SHEETS_WEBHOOK_URL` | Apps Script web app URL (ends in `/exec`) |
| `SHEETS_SECRET` | same value as `SECRET` in the Apps Script's Script Properties |

- `sheets`: writes to the Sheet; if that fails, the record goes to Airtable instead (nothing lost).
- `both`: writes to both (use for a trial period, then switch to `sheets`).
- **Rollback:** set `LOG_TARGET` to `airtable` (or delete it) and redeploy.
- **Different spreadsheet:** change `SHEET_ID` in the Apps Script's Script Properties. No Vercel change.
- **Moving the spreadsheet to another Drive folder:** nothing to change (the file ID stays the same).
- Health check: open `/api/log` or `/api/log-a2` in a browser. It shows the active target and writes nothing.

The Apps Script code is in `apps-script/Code.gs`. Tabs: Pre-Basic, A2 Economics, A2 Business.
