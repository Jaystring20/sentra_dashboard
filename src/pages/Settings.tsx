import { CheckCircle2, CircleDashed, Database, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, Card, CardHeader, PageHeader } from '../components/ui'
import { PipelineStrip } from '../components/widgets'
import { config, isSupabaseConfigured } from '../lib/data/config'
import { useData } from '../lib/store'

const FIELDS: [string, string, string][] = [
  ['id', 'text / uuid', 'Unique feedback identifier'],
  ['original_message', 'text', 'Original customer feedback (email body)'],
  ['subject', 'text', 'Email subject (optional)'],
  ['source', 'text', 'Origin, e.g. Gmail'],
  ['received_at', 'timestamptz', 'When the email was received'],
  ['customer_name', 'text', 'Sender name, where available'],
  ['customer_email', 'text', 'Sender email, where available'],
  ['sentiment', 'text', 'positive · neutral · negative'],
  ['sentiment_score', 'numeric', '−1 to +1 (0–10 and 0–100 are also accepted)'],
  ['category', 'text', 'e.g. Complaint, Praise, Suggestion, Question, Bug Report'],
  ['theme', 'text', 'Detected theme, e.g. Delivery'],
  ['issue', 'text', 'Detected problem, null when none'],
  ['severity', 'text', 'low · medium · high · critical'],
  ['ai_summary', 'text', 'One-sentence AI summary'],
  ['status', 'text', 'new · in_review · actioned · resolved'],
  ['created_at', 'timestamptz', 'Database insert time'],
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
  const host = isSupabaseConfigured ? new URL(config.supabaseUrl).host : '—'
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
              {isSupabaseConfigured ? (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-good-text" /> Live database (Supabase)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <CircleDashed size={14} className="text-warning-text" /> Demo data (no database configured)
                </span>
              )}
            </Row>
            <Row label="Project">{host}</Row>
            <Row label="Feedback table">
              <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{config.feedbackTable}</code>
            </Row>
            <Row label="Summary table">
              <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{config.summaryTable}</code> <span className="text-ink-3">(optional)</span>
            </Row>
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
              Create the tables in Supabase with <code className="rounded bg-surface-2 px-1 text-xs">supabase/schema.sql</code>.
            </li>
            <li>In n8n: Gmail trigger → extract sender, subject and body → AI node returning the JSON fields below → Supabase “Insert row” into the feedback table.</li>
            <li>
              Set <code className="rounded bg-surface-2 px-1 text-xs">VITE_SUPABASE_URL</code> and <code className="rounded bg-surface-2 px-1 text-xs">VITE_SUPABASE_ANON_KEY</code> in <code className="rounded bg-surface-2 px-1 text-xs">.env</code> and restart Sentra.
            </li>
            <li>Enable Realtime on the feedback table so new emails appear instantly (otherwise Sentra polls every minute).</li>
            <li>Optionally, a scheduled n8n workflow can write an AI executive summary to the summary table.</li>
          </ol>
        </Card>
      </div>

      <Card>
        <CardHeader title="Feedback record contract" subtitle="Fields Sentra reads from each database row. Labels are normalised, so capitalisation from the AI does not matter." />
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
