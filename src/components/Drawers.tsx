import { ArrowRight, Bot, Database, ExternalLink, Mail, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { sentimentCounts } from '../lib/analytics'
import { useData, usePanels } from '../lib/store'
import { FEEDBACK_STATUSES, type FeedbackRecord, type FeedbackStatus } from '../lib/types'
import { SentimentBar } from './charts'
import { Button, SentimentBadge, SentimentDot, SeverityBadge, StatusBadge, statusLabel, Tag } from './ui'

function Sheet({ title, subtitle, onClose, children, z, width = 'max-w-xl', covered = false }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode; z: string; width?: string; covered?: boolean }) {
  useEffect(() => {
    // Only the top-most sheet reacts to Escape.
    if (covered) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, covered])
  return (
    <div className={`fixed inset-0 ${z}`} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`absolute inset-y-0 right-0 flex w-full ${width} flex-col border-l border-border bg-surface shadow-2xl`}>
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {subtitle && <div className="mt-0.5 text-xs text-ink-3">{subtitle}</div>}
          </div>
          <Button variant="ghost" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium tracking-wide text-ink-3 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
  )
}

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function Trail({ record }: { record: FeedbackRecord }) {
  const lag = Math.max(0, Math.round((Date.parse(record.created_at) - Date.parse(record.received_at)) / 1000))
  const steps = [
    { icon: <Mail size={14} />, label: `Received via ${record.source}`, at: fmt(record.received_at) },
    { icon: <Bot size={14} />, label: 'Analyzed by AI (n8n)', at: `${record.category} · ${record.theme}` },
    { icon: <Database size={14} />, label: 'Stored in database', at: `${fmt(record.created_at)}${lag ? ` · ${lag < 120 ? `${lag}s` : `${Math.round(lag / 60)} min`} after receipt` : ''}` },
  ]
  return (
    <ol className="space-y-3">
      {steps.map((s) => (
        <li key={s.label} className="flex gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2">{s.icon}</span>
          <div>
            <p className="text-sm text-ink">{s.label}</p>
            <p className="text-xs text-ink-3">{s.at}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function FeedbackDetail({ record }: { record: FeedbackRecord }) {
  const { updateStatus } = useData()
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const change = async (s: FeedbackStatus) => {
    setSaving(true)
    setErr(null)
    try {
      await updateStatus(record.id, s)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update status')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="space-y-6 px-5 py-5">
      <section>
        <p className="mb-2 text-[11px] font-medium tracking-wide text-ink-3 uppercase">Original message</p>
        {record.subject && <p className="mb-1 text-sm font-semibold text-ink">{record.subject}</p>}
        <blockquote className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-ink">{record.original_message}</blockquote>
      </section>

      <section className="rounded-lg border border-accent/30 bg-accent-soft px-4 py-3">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-accent-text">
          <Bot size={13} /> AI summary
        </p>
        <p className="text-sm text-ink">{record.ai_summary || '—'}</p>
      </section>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Field label="Sentiment">
          <SentimentBadge sentiment={record.sentiment} />
        </Field>
        <Field label="Sentiment score">
          <span className="tabular">{record.sentiment_score > 0 ? '+' : ''}{record.sentiment_score.toFixed(2)}</span>
          <span className="ml-1 text-xs text-ink-3">(−1 to +1)</span>
        </Field>
        <Field label="Category">{record.category}</Field>
        <Field label="Theme">
          <Link className="text-accent-text hover:underline" to={`/themes/${encodeURIComponent(record.theme)}`}>
            {record.theme}
          </Link>
        </Field>
        <Field label="Issue">{record.issue ?? <span className="text-ink-3">None detected</span>}</Field>
        <Field label="Severity">
          <SeverityBadge severity={record.severity} />
        </Field>
        <Field label="Customer">
          {record.customer_name ?? <span className="text-ink-3">Unknown</span>}
          {record.customer_email && <span className="block truncate text-xs text-ink-3">{record.customer_email}</span>}
        </Field>
        <Field label="Source">{record.source}</Field>
        <Field label="Date received">{fmt(record.received_at)}</Field>
        <Field label="Status">
          <select
            aria-label="Feedback status"
            value={record.status}
            disabled={saving}
            onChange={(e) => void change(e.target.value as FeedbackStatus)}
            className="h-8 rounded-md border border-border bg-surface px-2 text-sm"
          >
            {FEEDBACK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
          {err && <p className="mt-1 text-xs text-critical-text">{err}</p>}
        </Field>
      </dl>

      <section>
        <p className="mb-3 text-[11px] font-medium tracking-wide text-ink-3 uppercase">Processing trail</p>
        <Trail record={record} />
      </section>
    </div>
  )
}

export function FeedbackRow({ record, onOpen, fresh }: { record: FeedbackRecord; onOpen: () => void; fresh?: boolean }) {
  return (
    <button onClick={onOpen} className={`group block w-full px-5 py-3.5 text-left hover:bg-surface-2 ${fresh ? 'flash-in' : ''}`}>
      <div className="flex items-center gap-2 text-xs text-ink-3">
        <SentimentDot sentiment={record.sentiment} />
        <span className="font-medium text-ink-2">{record.customer_name ?? 'Anonymous'}</span>
        <span>·</span>
        <span>{new Date(record.received_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span className="ml-auto font-mono">{record.id}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-ink">{record.original_message}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Tag>{record.theme}</Tag>
        {record.issue && <Tag>{record.issue}</Tag>}
        {record.severity !== 'low' && <SeverityBadge severity={record.severity} />}
        <StatusBadge status={record.status} />
        {fresh && <span className="text-xs font-medium text-accent-text">Just arrived</span>}
        <ArrowRight size={14} className="ml-auto text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </button>
  )
}

function EvidenceList({ ids }: { ids: string[] }) {
  const { byId, freshIds } = useData()
  const { openFeedback } = usePanels()
  const [limit, setLimit] = useState(25)
  const records = useMemo(
    () => ids.map((id) => byId.get(id)).filter((r): r is FeedbackRecord => Boolean(r)).sort((a, b) => b.received_at.localeCompare(a.received_at)),
    [ids, byId],
  )
  const c = sentimentCounts(records)
  return (
    <div>
      <div className="border-b border-border px-5 py-4">
        <div className="mb-2 flex items-center justify-between text-xs text-ink-2">
          <span>
            <span className="tabular font-semibold text-ink">{records.length}</span> supporting records
          </span>
          <span className="tabular">
            {c.positive} pos · {c.neutral} neu · {c.negative} neg
          </span>
        </div>
        <SentimentBar {...c} />
      </div>
      <ul className="divide-y divide-border">
        {records.slice(0, limit).map((r) => (
          <li key={r.id}>
            <FeedbackRow record={r} fresh={freshIds.has(r.id)} onOpen={() => openFeedback(r.id)} />
          </li>
        ))}
      </ul>
      {records.length > limit && (
        <div className="p-4 text-center">
          <Button onClick={() => setLimit((l) => l + 25)}>Show more ({records.length - limit} remaining)</Button>
        </div>
      )}
    </div>
  )
}

export function Drawers() {
  const { feedbackId, evidence, closeFeedback, closeEvidence } = usePanels()
  const { byId } = useData()
  const record = feedbackId ? byId.get(feedbackId) : undefined
  return (
    <>
      {evidence && (
        <Sheet
          z="z-40"
          covered={Boolean(record)}
          onClose={closeEvidence}
          title={evidence.title}
          subtitle={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{evidence.description ?? 'Feedback records contributing to this insight'}</span>
              <Link
                to={`/feedback?ids=${encodeURIComponent(evidence.ids.join(','))}&label=${encodeURIComponent(evidence.title)}`}
                onClick={closeEvidence}
                className="inline-flex items-center gap-1 font-medium text-accent-text hover:underline"
              >
                Open in Feedback <ExternalLink size={11} />
              </Link>
            </span>
          }
        >
          <EvidenceList ids={evidence.ids} />
        </Sheet>
      )}
      {record && (
        <Sheet z="z-50" width="max-w-lg" onClose={closeFeedback} title={`Feedback ${record.id}`} subtitle={<StatusBadge status={record.status} />}>
          <FeedbackDetail record={record} />
        </Sheet>
      )}
    </>
  )
}
