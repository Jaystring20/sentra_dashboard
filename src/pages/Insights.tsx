import clsx from 'clsx'
import { AlertTriangle, ListChecks, Repeat, ThumbsUp, TrendingUp } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SentimentBar } from '../components/charts'
import { Button, Card, EmptyState, PageHeader, Segmented } from '../components/ui'
import { ExecutiveSummaryCard, rangeLabel } from '../components/widgets'
import { detectInsights, sentimentCounts, type Insight, type InsightKind } from '../lib/analytics'
import { useData, usePanels } from '../lib/store'

export const KIND_META: Record<InsightKind, { label: string; icon: ReactNode; blurb: string; tone: string }> = {
  emerging: { label: 'Emerging trends', icon: <TrendingUp size={16} />, blurb: 'Patterns that are increasing or becoming more noticeable.', tone: 'text-accent-text bg-accent-soft' },
  recurring: { label: 'Recurring problems', icon: <Repeat size={16} />, blurb: 'Issues appearing across multiple feedback records.', tone: 'text-serious-text bg-surface-2' },
  positive: { label: 'Positive signals', icon: <ThumbsUp size={16} />, blurb: 'Areas customers consistently praise.', tone: 'text-good-text bg-surface-2' },
  risk: { label: 'Risk signals', icon: <AlertTriangle size={16} />, blurb: 'Negative or high-severity patterns requiring attention.', tone: 'text-critical-text bg-surface-2' },
}

const KINDS: InsightKind[] = ['emerging', 'recurring', 'positive', 'risk']

export function InsightCard({ insight }: { insight: Insight }) {
  const { byId } = useData()
  const { openEvidence } = usePanels()
  const meta = KIND_META[insight.kind]
  const evidence = useMemo(() => insight.evidenceIds.map((id) => byId.get(id)).filter((r) => r != null), [insight, byId])
  const counts = sentimentCounts(evidence)
  const sample = evidence[0]
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className={clsx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium', meta.tone)}>
          {meta.icon}
          {meta.label.replace(/s$/, '')}
        </span>
        <span className="ml-auto text-xs text-ink-3 capitalize">{insight.confidence} confidence</span>
      </div>
      <h3 className="text-[15px] leading-snug font-semibold text-ink">{insight.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{insight.description}</p>
      {sample && (
        <blockquote className="mt-3 border-l-2 border-border-strong pl-3 text-sm text-ink-2 italic">
          “{sample.original_message.length > 140 ? `${sample.original_message.slice(0, 140)}…` : sample.original_message}”
          <span className="mt-0.5 block text-xs text-ink-3 not-italic">— {sample.customer_name ?? 'Anonymous'}, {sample.id}</span>
        </blockquote>
      )}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-lg font-semibold text-ink tabular">{insight.metric}</span>
        <div className="flex-1">
          <SentimentBar {...counts} className="h-1.5" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button variant="primary" onClick={() => openEvidence({ title: insight.title, description: `${evidence.length} feedback records support this insight`, ids: insight.evidenceIds })}>
          <ListChecks size={14} /> View supporting feedback ({evidence.length})
        </Button>
        {insight.theme && (
          <Link to={`/themes/${encodeURIComponent(insight.theme)}`} className="text-xs font-medium text-accent-text hover:underline">
            {insight.theme} theme
          </Link>
        )}
      </div>
    </Card>
  )
}

export function Insights() {
  const { records, range, preset } = useData()
  const [kind, setKind] = useState<'all' | InsightKind>('all')
  const insights = useMemo(() => detectInsights(records, range), [records, range])

  const grouped = KINDS.map((k) => ({ kind: k, items: insights.filter((i) => i.kind === k) })).filter((g) => kind === 'all' || g.kind === kind)

  return (
    <>
      <PageHeader
        title="AI Insights"
        description={`${rangeLabel(preset)} · Patterns detected across analyzed feedback. Every insight links back to the records that produced it.`}
        actions={
          <Segmented
            label="Insight type"
            value={kind}
            onChange={setKind}
            options={[{ value: 'all', label: 'All' }, ...KINDS.map((k) => ({ value: k, label: KIND_META[k].label.split(' ')[0] }))]}
          />
        }
      />

      {!records.length ? (
        <Card>
          <EmptyState />
        </Card>
      ) : (
        <>
          <ExecutiveSummaryCard className="mb-6" />
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(kind === k ? 'all' : k)}
                className={clsx('rounded-xl border bg-surface p-4 text-left transition-colors hover:bg-surface-2', kind === k ? 'border-accent' : 'border-border')}
              >
                <span className={clsx('mb-2 inline-flex rounded-md p-1.5', KIND_META[k].tone)}>{KIND_META[k].icon}</span>
                <p className="text-2xl font-semibold text-ink tabular">{insights.filter((i) => i.kind === k).length}</p>
                <p className="text-xs text-ink-2">{KIND_META[k].label}</p>
              </button>
            ))}
          </div>
          {grouped.map((g) => (
            <section key={g.kind} className="mb-8">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                {KIND_META[g.kind].icon}
                {KIND_META[g.kind].label}
                <span className="text-sm font-normal text-ink-3">({g.items.length})</span>
              </h2>
              <p className="mb-3 text-sm text-ink-3">{KIND_META[g.kind].blurb}</p>
              {g.items.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {g.items.map((i) => (
                    <InsightCard key={i.id} insight={i} />
                  ))}
                </div>
              ) : (
                <Card>
                  <p className="px-5 py-8 text-center text-sm text-ink-3">No {KIND_META[g.kind].label.toLowerCase()} detected in this period.</p>
                </Card>
              )}
            </section>
          ))}
        </>
      )}
    </>
  )
}
