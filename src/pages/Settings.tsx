import { CheckCircle2, CircleDashed, Database, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, Card, CardHeader, PageHeader } from '../components/ui'
import { PipelineStrip } from '../components/widgets'
import { config } from '../lib/data/config'
import { dataSource } from '../lib/data/source'
import { useData } from '../lib/store'

const FIELDS: [string, string, string][] = [
  ['id', 'text', 'Unique feedback identifier'],
  ['original_message', 'text', 'Original customer feedback (email body)'],
  ['subject', 'text', 'Email subject (optional)'],
  ['source', 'text', 'Origin, e.g. Gmail'],
  ['received_at', 'date & time', 'When the email was received'],
  ['customer_name', 'text', 'Sender name, where available'],
  ['customer_email', 'text', 'Sender email, where available'],
  ['sentiment', 'text', 'positive · neutral · negative'],
  ['sentiment_score', 'number', '−1 to +1 (0–10 and 0–100 are also accepted)'],
  ['category', 'text', 'e.g. Complaint, Praise, Suggestion, Question, Bug Report'],
  ['theme', 'text', 'Detected theme, e.g. Delivery'],
  ['issue', 'text', 'Detected problem, empty when none'],
  ['severity', 'text', 'low · medium · high · critical'],
  ['ai_summary', 'text', 'One-sentence AI summary'],
  ['status', 'text', 'new · in_review · actioned · resolved'],
  ['created_at', 'date & time', 'When n8n wrote the row'],
  ['gmail_message_id', 'text', 'Gmail message id, lets n8n skip duplicates (optional)'],
]

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:gap-4">
      <dt className="w-44 shrink-0 text-sm text-ink-2">{label}</dt>
      <dd className="min-w-0 text-sm break-all text-ink">{children}</dd>
    </div>
  )
}

export function Settings() {
  const { records, lastSynced, error, reload } = useData()
  const sheetsHost = config.sheetsApiUrl ? config.sheetsApiUrl.replace(/^https:\/\//, '').replace(/\/exec.*$/, '/exec').slice(0, 64) + '…' : '—'
  const resetIssues = () => {
    try {
      localStorage.removeItem('sentra-issue-status')
    } catch {
      /* ignore */
    }
    window.location.reload()
  }
  return (
    <>
      <PageHeader title="Settings" description="Data connection, pipeline overview and the data contract between n8n and Sentra." />

      <div className="mb-4">
        <PipelineStrip />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-1.5">
                <Database size={15} /> Data source
              </span>
            }
          />
          <dl className="divide-y divide-border border-t border-border px-5">
            <Row label="Mode">
              {dataSource.mode === 'demo' ? (
                <span className="inline-flex items-center gap-1.5">
                  <CircleDashed size={14} className="text-warning-text" /> Demo data (no data source configured)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-good-text" /> Live · {dataSource.label}
                </span>
              )}
            </Row>
            {dataSource.mode === 'sheets' && (
              <>
                <Row label="Web app">{sheetsHost}</Row>
                <Row label="Tabs">
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">feedback</code>, <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">executive_summaries</code> <span className="text-ink-3">(optional)</span>
                </Row>
                <Row label="Status changes">{config.sheetsToken ? 'Saved to the sheet' : <span className="text-warning-text">Read-only — set VITE_SHEETS_TOKEN</span>}</Row>
                <Row label="Checks for new rows">Every {config.sheetsPollSeconds} s</Row>
              </>
            )}
            {dataSource.mode === 'supabase' && (
              <>
                <Row label="Project">{new URL(config.supabaseUrl).host}</Row>
                <Row label="Feedback table">
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{config.feedbackTable}</code>
                </Row>
              </>
            )}
            <Row label="Records loaded">{records.length.toLocaleString()}</Row>
            <Row label="Last synced">{lastSynced ? lastSynced.toLocaleString() : '—'}</Row>
            <Row label="Status">{error ? <span className="text-critical-text">{error}</span> : 'Connected'}</Row>
          </dl>
          <div className="flex flex-wrap gap-2 px-5 py-4">
            <Button onClick={reload}>Refresh now</Button>
            <Button variant="ghost" onClick={resetIssues}>
              <RotateCcw size={14} /> Reset issue statuses
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Connecting the live pipeline" subtitle="Sentra reads what n8n writes; it does not run the automation itself." />
          <ol className="list-decimal space-y-2.5 px-5 pb-5 pl-10 text-sm text-ink-2">
            <li>
              In your Google Sheet open <strong>Extensions → Apps Script</strong>, paste <code className="rounded bg-surface-2 px-1 text-xs">google-sheets/Code.gs</code> and run <code className="rounded bg-surface-2 px-1 text-xs">setupSheet</code> once.
            </li>
            <li>
              Add a script property <code className="rounded bg-surface-2 px-1 text-xs">SENTRA_TOKEN</code>, then deploy as a web app (execute as you, access: Anyone).
            </li>
            <li>In n8n: Gmail trigger → AI node returning the fields below → Google Sheets “Append row” into the <code className="rounded bg-surface-2 px-1 text-xs">feedback</code> tab.</li>
            <li>
              Set <code className="rounded bg-surface-2 px-1 text-xs">VITE_SHEETS_API_URL</code> and <code className="rounded bg-surface-2 px-1 text-xs">VITE_SHEETS_TOKEN</code> (in <code className="rounded bg-surface-2 px-1 text-xs">.env</code> or Vercel) and redeploy.
            </li>
            <li>Optionally, a scheduled n8n workflow can append an AI executive summary to the <code className="rounded bg-surface-2 px-1 text-xs">executive_summaries</code> tab.</li>
          </ol>
        </Card>
      </div>

      <Card>
        <CardHeader title="Feedback record contract" subtitle="Column headers in the feedback tab (one row per email). Labels are normalised, so capitalisation from the AI does not matter." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-y border-border text-[11px] tracking-wide text-ink-3 uppercase">
              <tr>
                <th className="px-5 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {FIELDS.map(([f, t, p]) => (
                <tr key={f}>
                  <td className="px-5 py-2 font-mono text-xs text-ink">{f}</td>
                  <td className="px-3 py-2 text-xs text-ink-3">{t}</td>
                  <td className="px-5 py-2 text-ink-2">{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
