import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FeedbackRow } from '../components/Drawers'
import { Button, Card, EmptyState, NoResults, PageHeader, Select, SentimentBadge, SeverityBadge, StatusBadge, statusLabel } from '../components/ui'
import { rangeLabel } from '../components/widgets'
import { useData, usePanels } from '../lib/store'
import { FEEDBACK_STATUSES, SENTIMENTS, SEVERITIES, SEVERITY_RANK, type FeedbackRecord } from '../lib/types'

const PAGE_SIZE = 20
const FILTER_KEYS = ['q', 'sentiment', 'category', 'theme', 'issue', 'severity', 'status', 'source', 'from', 'to', 'ids', 'label'] as const

type SortKey = 'newest' | 'oldest' | 'most_negative' | 'most_positive' | 'severity'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most_negative', label: 'Most negative' },
  { value: 'most_positive', label: 'Most positive' },
  { value: 'severity', label: 'Highest severity' },
]

function uniq(records: FeedbackRecord[], key: keyof FeedbackRecord) {
  return [...new Set(records.map((r) => r[key]).filter((v): v is string => typeof v === 'string' && v !== ''))].sort()
}

function toCsv(rows: FeedbackRecord[]) {
  const cols: (keyof FeedbackRecord)[] = ['id', 'received_at', 'source', 'customer_name', 'customer_email', 'sentiment', 'sentiment_score', 'category', 'theme', 'issue', 'severity', 'status', 'ai_summary', 'original_message']
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
}

export function Feedback() {
  const { records, range, preset, freshIds } = useData()
  const { openFeedback } = usePanels()
  const [params, setParams] = useSearchParams()
  const get = (k: string) => params.get(k) ?? ''
  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }

  const ids = get('ids')
  const idSet = useMemo(() => (ids ? new Set(ids.split(',')) : null), [ids])
  const sort = (get('sort') || 'newest') as SortKey
  const page = Math.max(1, parseInt(get('page') || '1', 10))

  const options = useMemo(
    () => ({ categories: uniq(records, 'category'), themes: uniq(records, 'theme'), sources: uniq(records, 'source'), issues: uniq(records, 'issue') }),
    [records],
  )

  // Evidence links (ids=…) and explicit from/to dates override the global range.
  const customDates = Boolean(get('from') || get('to'))
  const usesGlobalRange = !idSet && !customDates

  const filtered = useMemo(() => {
    const q = get('q').toLowerCase()
    const from = get('from') ? Date.parse(get('from')) : usesGlobalRange ? range.from.getTime() : -Infinity
    const to = get('to') ? Date.parse(get('to')) + 86_399_999 : usesGlobalRange ? range.to.getTime() : Infinity
    const eq = (k: keyof FeedbackRecord, r: FeedbackRecord) => !get(k) || String(r[k] ?? '') === get(k)
    const list = records.filter((r) => {
      if (idSet && !idSet.has(r.id)) return false
      const t = Date.parse(r.received_at)
      if (t < from || t > to) return false
      if (!eq('sentiment', r) || !eq('category', r) || !eq('theme', r) || !eq('issue', r) || !eq('severity', r) || !eq('status', r) || !eq('source', r)) return false
      if (q) {
        const hay = `${r.original_message} ${r.subject ?? ''} ${r.ai_summary} ${r.customer_name ?? ''} ${r.customer_email ?? ''} ${r.id} ${r.theme} ${r.issue ?? ''} ${r.category}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    const cmp: Record<SortKey, (a: FeedbackRecord, b: FeedbackRecord) => number> = {
      newest: (a, b) => b.received_at.localeCompare(a.received_at),
      oldest: (a, b) => a.received_at.localeCompare(b.received_at),
      most_negative: (a, b) => a.sentiment_score - b.sentiment_score,
      most_positive: (a, b) => b.sentiment_score - a.sentiment_score,
      severity: (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.received_at.localeCompare(a.received_at),
    }
    return list.sort(cmp[sort] ?? cmp.newest)
  }, [records, params, range, idSet, usesGlobalRange, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const activeFilters = FILTER_KEYS.filter((k) => get(k))
  const clearAll = () => setParams(new URLSearchParams(), { replace: true })

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sentra-feedback-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!records.length) {
    return (
      <>
        <PageHeader title="Feedback" />
        <Card>
          <EmptyState />
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Feedback"
        description="Explore every analyzed feedback record. Open a record to see the original message and the AI analysis."
        actions={
          <Button onClick={exportCsv} disabled={!filtered.length}>
            <Download size={14} /> Export CSV
          </Button>
        }
      />

      {idSet && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft px-4 py-2.5 text-sm">
          <span className="text-ink">
            Showing <strong>{idSet.size}</strong> supporting records{get('label') ? <> for “{get('label')}”</> : null}
          </span>
          <Button variant="ghost" className="ml-auto" onClick={() => set({ ids: '', label: '' })}>
            <X size={14} /> Show all feedback
          </Button>
        </div>
      )}

      <Card className="mb-4 p-4">
        <div className="relative mb-3">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={get('q')}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Search messages, summaries, customers, IDs…"
            aria-label="Search feedback"
            className="h-10 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-accent"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          <Select label="Sentiment" value={get('sentiment')} onChange={(e) => set({ sentiment: e.target.value })}>
            <option value="">All</option>
            {SENTIMENTS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
          <Select label="Category" value={get('category')} onChange={(e) => set({ category: e.target.value })}>
            <option value="">All</option>
            {options.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select label="Theme" value={get('theme')} onChange={(e) => set({ theme: e.target.value })}>
            <option value="">All</option>
            {options.themes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select label="Severity" value={get('severity')} onChange={(e) => set({ severity: e.target.value })}>
            <option value="">All</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
          <Select label="Status" value={get('status')} onChange={(e) => set({ status: e.target.value })}>
            <option value="">All</option>
            {FEEDBACK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
          <Select label="Source" value={get('source')} onChange={(e) => set({ source: e.target.value })}>
            <option value="">All</option>
            {options.sources.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[11px] font-medium tracking-wide text-ink-3 uppercase">From</span>
            <input type="date" value={get('from')} onChange={(e) => set({ from: e.target.value })} className="h-9 min-w-0 rounded-lg border border-border bg-surface px-2 text-sm text-ink" />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[11px] font-medium tracking-wide text-ink-3 uppercase">To</span>
            <input type="date" value={get('to')} onChange={(e) => set({ to: e.target.value })} className="h-9 min-w-0 rounded-lg border border-border bg-surface px-2 text-sm text-ink" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-ink-2">
          <span className="tabular">
            <strong className="text-ink">{filtered.length.toLocaleString()}</strong> records
            {usesGlobalRange && <> · {rangeLabel(preset)}</>}
            {get('issue') && <> · issue “{get('issue')}”</>}
          </span>
          {activeFilters.length > 0 && (
            <Button variant="ghost" className="!px-2 !py-0.5 text-xs" onClick={clearAll}>
              <X size={12} /> Clear filters
            </Button>
          )}
          <label className="ml-auto flex items-center gap-2">
            <span className="text-ink-3">Sort</span>
            <select value={sort} onChange={(e) => set({ sort: e.target.value })} className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-ink">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <NoResults onClear={clearAll} />
        ) : (
          <>
            {/* table (md+) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-[11px] tracking-wide text-ink-3 uppercase">
                  <tr>
                    <Th>Received</Th>
                    <Th>Customer</Th>
                    <Th className="w-[40%]">Feedback</Th>
                    <Th>Sentiment</Th>
                    <Th>Theme</Th>
                    <Th>Severity</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((r) => (
                    <tr
                      key={r.id}
                      tabIndex={0}
                      onClick={() => openFeedback(r.id)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openFeedback(r.id))}
                      className={clsx('cursor-pointer align-top hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none', freshIds.has(r.id) && 'flash-in')}
                    >
                      <Td className="whitespace-nowrap text-ink-2">
                        {new Date(r.received_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        <span className="block text-xs text-ink-3">{new Date(r.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </Td>
                      <Td className="max-w-40">
                        <span className="block truncate text-ink">{r.customer_name ?? 'Anonymous'}</span>
                        <span className="block truncate text-xs text-ink-3">{r.source}</span>
                      </Td>
                      <Td>
                        <span className="line-clamp-2 text-ink">{r.original_message}</span>
                        <span className="mt-0.5 block truncate text-xs text-ink-3">{r.issue ? `Issue: ${r.issue}` : r.category}</span>
                      </Td>
                      <Td>
                        <SentimentBadge sentiment={r.sentiment} score={r.sentiment_score} />
                      </Td>
                      <Td className="text-ink-2">{r.theme}</Td>
                      <Td>
                        <SeverityBadge severity={r.severity} />
                      </Td>
                      <Td>
                        <StatusBadge status={r.status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* cards (mobile) */}
            <ul className="divide-y divide-border md:hidden">
              {visible.map((r) => (
                <li key={r.id}>
                  <FeedbackRow record={r} fresh={freshIds.has(r.id)} onOpen={() => openFeedback(r.id)} />
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-ink-2">
              <span className="tabular">
                {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" aria-label="Previous page" disabled={current <= 1} onClick={() => set({ page: String(current - 1) })}>
                  <ChevronLeft size={16} />
                </Button>
                <span className="tabular">
                  Page {current} / {pages}
                </span>
                <Button variant="ghost" aria-label="Next page" disabled={current >= pages} onClick={() => set({ page: String(current + 1) })}>
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  )
}

function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={clsx('px-4 py-2.5 font-medium', className)}>{children}</th>
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={clsx('px-4 py-3', className)}>{children}</td>
}
