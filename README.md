# Sentra — Feedback Intelligence Engine

Sentra is the dashboard at the end of the capstone pipeline. It turns analyzed customer feedback into sentiment, themes, recurring issues, alerts and AI insights. Every insight links back to the feedback records behind it.

```
Customer → Gmail → n8n → AI analysis → Database (Supabase) → Sentra
```

Sentra does not run the automation. n8n receives each email, asks the AI to analyze it and writes one structured row to the database. Sentra reads those rows, aggregates them and presents them.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

With no database configured, Sentra runs on a built-in **demo dataset**: about 120 days of realistic feedback with some patterns built in. One complaint (slow support replies) is rising, one billing problem is critical, and staff and product quality are consistently praised. In demo mode the **Simulate email** button stands in for the n8n workflow writing a new row, so you can see the dashboard update live.

### Connect the live pipeline

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Build the n8n workflow (below) and point its Supabase node at the `feedback` table, using the **service role** key.
4. Restart Sentra. New rows appear instantly through Supabase Realtime. If Realtime is off, Sentra checks for new rows every 60 seconds.

## n8n workflow (reference)

| Step | Node | Notes |
|------|------|-------|
| 1 | **Gmail Trigger** | Watch the feedback inbox or label |
| 2 | **Set / Code** | Extract `from` name and email, `subject`, plain-text body, `date`, message id |
| 3 | **AI node** (OpenAI / Anthropic / Gemini) | Prompt below, JSON output |
| 4 | **Code** | Merge the email fields with the AI JSON |
| 5 | **Supabase → Insert row** | Table `feedback`; `gmail_message_id` is unique, so re-runs cannot create duplicates |
| (optional) | **Schedule → AI → Supabase** | Write a daily executive summary to `executive_summaries` |

Suggested AI instruction:

```text
You analyze customer feedback for a business. Return ONLY JSON:
{
  "sentiment": "positive" | "neutral" | "negative",
  "sentiment_score": number between -1 and 1,
  "category": "Complaint" | "Praise" | "Suggestion" | "Question" | "Bug Report",
  "theme": short Title Case theme, reuse one of: Delivery, Customer Support, Product Quality,
           Pricing & Billing, Mobile App, Staff & Service, Returns & Refunds, Website & Checkout
           (or a new one only if none fit),
  "issue": short problem name in sentence case (e.g. "Late delivery") or null when there is no problem,
  "severity": "low" | "medium" | "high" | "critical",
  "ai_summary": one sentence summary
}
Severity: critical = money lost, safety or legal risk; high = product or service unusable, or the customer threatens to leave;
medium = inconvenience that needs follow-up; low = praise, questions, suggestions.
```

Reusing a fixed list of themes and issue names is what lets Sentra group feedback into recurring patterns. Sentra also cleans up casing, score scales (−1..1, 0..10 or 0..100) and synonyms such as "urgent" or "closed", so imperfect AI output still renders correctly.

## Data contract

The `feedback` row Sentra reads: `id, original_message, subject, source, received_at, customer_name, customer_email, sentiment, sentiment_score, category, theme, issue, severity, ai_summary, status, created_at`. The Settings page shows the same contract.

## What's in the dashboard

| Page | Contents |
|------|----------|
| **Overview** | Pipeline status, KPI cards compared with the previous period, feedback trend, sentiment breakdown, AI executive summary, top themes, top issues, recent customer voice |
| **Feedback** | Search, filters (date, sentiment, category, theme, severity, status, source), sorting, pagination, CSV export, detail panel with the original message, AI analysis, status editing and the processing trail |
| **AI Insights** | Emerging trends, recurring problems, positive signals, risk signals. Each has a quote, a confidence level and **View supporting feedback** |
| **Sentiment** | Distribution, sentiment over time, average score, positive and negative trends, sentiment by theme and by category (filterable by theme) |
| **Themes** | Theme cards (mentions, share, sentiment, trend, related issues) and a theme detail page with an explanation, trend, related issues, supporting feedback and theme insights |
| **Issues & Alerts** | Rule-based alerts with their evidence; issue table with frequency, severity, sentiment, first and last detected, trend and an editable status (New / Investigating / Monitoring / Resolved) |
| **Analytics** | Volume, sentiment trend, theme trend, issue frequency, category and source distribution, feedback by weekday or hour; daily, weekly or monthly granularity |
| **Settings** | Data source status, setup steps, field contract |

The date range (7D / 30D / 90D / All) applies to every page. Trends compare the selected range with the period of the same length just before it. For *All time*, they compare the second half of the range with the first half.

### Traceability

Insights, alerts, issues, themes and sentiment rows all keep the ids of the records they were computed from. **View supporting feedback** opens those records. Each record opens the original message and its analysis. **Open in Feedback** turns the same set into a filtered Feedback view (`/feedback?ids=…`) you can share.

### Insight and alert rules

Pattern detection is rule-based and runs over the stored AI output (`src/lib/analytics.ts`), so results are explainable and reproducible:

- **Emerging**: an issue with at least 3 reports that grew at least 1.5× against the comparison window (or appeared for the first time), or a theme that grew at least 1.4×.
- **Recurring**: an issue with at least 3 reports in the range.
- **Positive signal**: a theme where at least 60% of feedback (and at least 3 records) is positive.
- **Risk signal**: an issue with high or critical severity, or a theme whose negative share rose by at least 15 points.
- **Alerts**: negative feedback up at least 25%, a new recurring issue (first seen within 14 days, at least 3 reports), average sentiment moved by at least 0.15, one issue making up at least 8% of recent feedback, or an emerging negative theme.

## Scripts

```bash
npm run dev        # dev server
npm run build      # type-check + production build (dist/)
npm run preview    # serve the production build
npm test           # unit tests (analytics + normalisation)
```

Stack: React 19, TypeScript, Vite, Tailwind CSS 4, Recharts, Supabase JS, React Router.

## Notes

- Issue status changes are saved in the browser (localStorage). Feedback status changes are written to the database.
- The RLS policies in `schema.sql` let the anon key read rows and update feedback. That suits a capstone demo. For production, require sign-in and limit updates to the `status` column.
