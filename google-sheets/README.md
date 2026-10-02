# Google Sheets setup

Sentra uses a Google Sheet as its database. n8n appends one row per analyzed email. A small Apps Script attached to the sheet (`Code.gs`) lets the dashboard read those rows and save status changes back to them.

```
Gmail → n8n → AI → Google Sheet (feedback tab) ⇄ Apps Script web app ⇄ Sentra
```

Setup takes about 10 minutes.

## 1. Create the sheet

1. Create a new Google Sheet, for example **Sentra Feedback**.
2. Open **Extensions → Apps Script**. Delete the sample code, paste the contents of [`Code.gs`](Code.gs) and save.
3. In the function dropdown at the top, choose **`setupSheet`** and click **Run**. Approve the permission prompt; it only asks for access to this spreadsheet.

   This creates two tabs with bold, frozen header rows:
   - **`feedback`**: one row per email, with the 17 columns listed below. The `status` column gets a dropdown.
   - **`executive_summaries`** (optional): `generated_at`, `summary`, `highlights`.

   Running `setupSheet` again is safe. It only adds missing columns and never deletes data.

## 2. Set a token for status changes

In Apps Script, open **Project Settings** (gear icon) → **Script properties** → **Add script property**:

| Property | Value |
|---|---|
| `SENTRA_TOKEN` | any long random string, e.g. `s3ntra-7f9c2e...` |

The dashboard must send this token to change a status. Reading data does not need it.

## 3. Deploy the web app

1. Click **Deploy → New deployment**, choose the gear icon, then **Web app**.
2. Set **Execute as: Me** and **Who has access: Anyone**.
3. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.
4. Test it by opening `<web app URL>?action=health` in a browser. You should see `{"ok":true,"rows":0}`.

> **After editing `Code.gs`**, use **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. This keeps the same URL. Creating a *new deployment* gives you a new URL instead.

## 4. Point Sentra at the sheet

Set these environment variables. Locally they go in `.env`. On Vercel, add them under **Project → Settings → Environment Variables**, then redeploy:

```
VITE_SHEETS_API_URL=https://script.google.com/macros/s/XXXX/exec
VITE_SHEETS_TOKEN=<the SENTRA_TOKEN value>
```

The badge in the dashboard's bottom-left corner changes from **Demo data** to **Live · Google Sheets**. Sentra checks the sheet for new rows every 30 seconds while the tab is open (`VITE_SHEETS_POLL_SECONDS`), and again whenever you return to the tab.

## 5. Connect n8n

At the end of the workflow, after the AI step, add a **Google Sheets → Append Row** node:

- **Document**: your Sentra sheet. **Sheet**: `feedback`.
- **Mapping**: "Map each column manually". Fill the columns from the email and the AI output:

| Column | Value |
|---|---|
| `id` | `FB-{{ $now.toMillis() }}`, or any unique value |
| `original_message` | email body (plain text) |
| `subject` | email subject |
| `source` | `Gmail` |
| `received_at` | email date, in ISO format |
| `customer_name`, `customer_email` | sender |
| `sentiment` | AI: `positive` / `neutral` / `negative` |
| `sentiment_score` | AI: −1 to 1 |
| `category`, `theme`, `issue` | AI (`issue` empty when there is no problem) |
| `severity` | AI: `low` / `medium` / `high` / `critical` |
| `ai_summary` | AI: one sentence |
| `status` | `new` |
| `created_at` | `{{ $now.toISO() }}` |
| `gmail_message_id` | Gmail message id (optional, useful for skipping duplicates) |

The AI prompt and the field definitions are in the main [README](../README.md#n8n-workflow-reference). [`feedback-template.csv`](feedback-template.csv) shows a sample row.

**Optional executive summary.** A scheduled n8n workflow can append a row to `executive_summaries` with `generated_at` (ISO date), `summary` (text) and `highlights`. `highlights` can be a JSON array like `["…","…"]` or one highlight per line. Sentra shows the newest one. When the tab is empty, Sentra writes its own summary from the rows.

## Good to know

- **Editing by hand works.** You can add, fix or delete rows directly in the sheet. A row needs at least `original_message`. If a row has no `id`, Sentra uses its row number, so avoid sorting or deleting rows while relying on those ids.
- **Header names must match exactly** (lowercase, underscores). Column order doesn't matter.
- **Labels are forgiving.** `Negative`, `HIGH`, `In Review`, and scores on a 0–10 or 0–100 scale are all normalized.
- **Access.** Anyone with the web app URL can *read* the feedback, and the URL is visible in the deployed dashboard's code. The token is also included in the deployed dashboard, so it stops casual misuse but is not a real secret. That's fine for a capstone demo with sample customers. Don't put sensitive customer data in a public deployment.
- **Limits.** Apps Script is fine for thousands of rows. Each refresh downloads the whole tab, so for very large volumes, move to a real database (Sentra also supports Supabase; see `supabase/schema.sql`).
