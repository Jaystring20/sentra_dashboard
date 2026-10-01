import { ArrowLeft, Bot, ListChecks } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BarList, Legend, SENTIMENT_LEGEND, SentimentBar, SentimentStackChart } from '../components/charts'
import { FeedbackRow } from '../components/Drawers'
import { Button, Card, CardHeader, EmptyState, PageHeader, Segmented, SeverityBadge, TrendText } from '../components/ui'
import { rangeLabel } from '../components/widgets'
import { comparisonWindows, countBy, detectInsights, inRange, issueStats, themeStats, timeSeries, type ThemeStat } from '../lib/analytics'
import { useData, usePanels } from '../lib/store'
import { InsightCard } from './Insights'

type SortKey = 'mentions' | 'negative' | 'trend'

export function Themes() {
  const { records, range, preset } = useData()
  const navigate = useNavigate()
  const [sort, setSort] = useState<SortKey>('mentions')
  const themes = useMemo(() => {
    const current = inRange(records, range.from, range.to)
    const list = themeStats(current, comparisonWindows(records, range))
    if (sort === 'negative') return [...list].sort((a, b) => b.negative / b.count - a.negative / a.count)
    if (sort === 'trend') return [...list].sort((a, b) => (b.trend ?? Infinity) - (a.trend ?? Infinity))
    return list
  }, [records, range, sort])

  return (
    <>
      <PageHeader
        title="Themes"
        description={`${rangeLabel(preset)} · Recurring subjects detected by AI across customer feedback.`}
        actions={
          <Segmented
            label="Sort themes"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'mentions', label: 'Mentions' },
              { value: 'negative', label: 'Most negative' },
              { value: 'trend', label: 'Trending' },
            ]}
          />
        }
      />
      {!themes.length ? (
        <Card>{records.length ? <EmptyState title="No themes in this period" message="No feedback was received in the selected date range." /> : <EmptyState />}</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {themes.map((t) => (
            <ThemeCard key={t.name} theme={t} onOpen={() => navigate(`/themes/${encodeURIComponent(t.name)}`)} />
          ))}
        </div>
      )}
    </>
  )
}

function ThemeCard({ theme: t, onOpen }: { theme: ThemeStat; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="flex flex-col rounded-xl border border-border bg-surface p-5 text-left transition-colors hover:border-border-strong hover:bg-surface-2/40">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-ink">{t.name}</h3>
        <TrendText trend={t.trend} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-ink tabular">{t.count}</span>
        <span className="text-sm text-ink-2">mentions</span>
        <span className="ml-auto text-sm text-ink-2 tabular">{Math.round(t.share * 100)}% of feedback</span>
      </div>
      <div className="mt-3">
        <SentimentBar positive={t.positive} neutral={t.neutral} negative={t.negative} />
        <p className="mt-1.5 text-xs text-ink-3 tabular">
          {t.positive} positive · {t.neutral} neutral · {t.negative} negative
        </p>
      </div>
      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-1.5 text-[11px] font-medium tracking-wide text-ink-3 uppercase">Related issues</p>
        {t.relatedIssues.length ? (
          <ul className="space-y-1">
            {t.relatedIssues.slice(0, 3).map((i) => (
              <li key={i.name} className="flex justify-between gap-2 text-sm">
                <span className="truncate text-ink-2">{i.name}</span>
                <span className="text-ink-3 tabular">{i.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-3">No problems detected</p>
        )}
      </div>
    </button>
  )
}

function explainTheme(t: ThemeStat, summaries: { name: string; count: number }[], issues: { name: string; count: number }[]) {
  const pos = t.positive / t.count
  const neg = t.negative / t.count
  const tone = pos >= 0.6 ? 'predominantly positive' : neg >= 0.6 ? 'predominantly negative' : neg > pos ? 'mixed, leaning negative' : 'mixed, leaning positive'
  const trend =
    t.trend == null ? 'It is a newly emerging theme.' : t.trend > 0.2 ? `Mentions are rising (${Math.round(t.trend * 100)}% more than the comparison window).` : t.trend < -0.2 ? `Mentions are declining (${Math.round(-t.trend * 100)}% fewer than the comparison window).` : 'Volume is broadly stable.'
  const what = summaries.slice(0, 2).map((s) => s.name.replace(/\.$/, '').toLowerCase())
  return [
    `Customers mention ${t.name} in ${Math.round(t.share * 100)}% of feedback, and sentiment is ${tone}.`,
    what.length ? `The AI most often summarises these messages as: “${what.join('” and “')}”.` : '',
    issues.length ? `The leading problem is “${issues[0].name}” (${issues[0].count} reports).` : 'No specific problems are attached to this theme.',
    trend,
  ]
    .filter(Boolean)
    .join(' ')
}

export function ThemeDetail() {
  const { name = '' } = useParams()
  const theme = decodeURIComponent(name)
  const { records, range, preset, freshIds } = useData()
  const { openFeedback, openEvidence } = usePanels()
  const [limit, setLimit] = useState(10)

  const d = useMemo(() => {
    const scoped = records.filter((r) => r.theme === theme)
    const current = inRange(scoped, range.from, range.to)
    const allCurrent = inRange(records, range.from, range.to)
    const cmp = comparisonWindows(records, range)
    const stat = themeStats(allCurrent, cmp).find((t) => t.name === theme)
    return {
      scoped,
      current,
      stat,
      series: timeSeries(current, range),
      issues: issueStats(current, records, cmp),
      summaries: countBy(current, 'ai_summary'),
      insights: detectInsights(records, range).filter((i) => i.theme === theme),
    }
  }, [records, range, theme])

  const back = (
    <Link to="/themes" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
      <ArrowLeft size={14} /> All themes
    </Link>
  )

  if (!d.scoped.length) {
    return (
      <>
        {back}
        <Card>
          <EmptyState title="Theme not found" message={`No feedback has been tagged with the theme “${theme}”.`} />
        </Card>
      </>
    )
  }

  const t = d.stat
  return (
    <>
      {back}
      <PageHeader
        title={theme}
        description={`${rangeLabel(preset)} · Theme detail`}
        actions={
          <Button variant="primary" onClick={() => openEvidence({ title: `${theme} — all feedback`, ids: d.current.map((r) => r.id) })} disabled={!d.current.length}>
            <ListChecks size={14} /> View supporting feedback ({d.current.length})
          </Button>
        }
      />

      {!t ? (
        <Card>
          <EmptyState title="No mentions in this period" message={`“${theme}” has ${d.scoped.length} records overall, but none in the selected range.`} />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Mentions" value={String(t.count)} />
            <Stat label="Share of feedback" value={`${Math.round(t.share * 100)}%`} />
            <Stat label="Average sentiment" value={`${t.avgScore > 0 ? '+' : ''}${t.avgScore.toFixed(2)}`} />
            <Card className="p-4">
              <p className="text-xs font-medium text-ink-2">Trend</p>
              <div className="mt-2 text-2xl">
                <TrendText trend={t.trend} />
              </div>
              <p className="mt-1 text-xs text-ink-3">{t.previousCount} in comparison window</p>
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title={
                  <span className="flex items-center gap-1.5">
                    <Bot size={15} className="text-accent-text" /> Theme summary & explanation
                  </span>
                }
                subtitle="Synthesised from the AI analysis of each record"
              />
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed text-ink">{explainTheme(t, d.summaries, d.issues)}</p>
                <div className="mt-4">
                  <SentimentBar positive={t.positive} neutral={t.neutral} negative={t.negative} className="h-2.5" />
                  <div className="mt-2">
                    <Legend items={SENTIMENT_LEGEND.map((s) => ({ ...s, label: `${s.label} ${t[s.label.toLowerCase() as 'positive']}` }))} />
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader title="Categories" subtitle="How this feedback is classified" />
              <div className="px-3 pb-4">
                <BarList items={t.categories} />
              </div>
            </Card>
          </div>

          <Card className="mb-4">
            <CardHeader title="Trend" subtitle="Mentions over time by sentiment" action={<Legend items={SENTIMENT_LEGEND} />} />
            <div className="px-3 pb-4">
              <SentimentStackChart data={d.series} height={220} />
            </div>
          </Card>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Related issues" subtitle="Select an issue to see its feedback" />
              {d.issues.length ? (
                <ul className="divide-y divide-border border-t border-border">
                  {d.issues.map((i) => (
                    <li key={i.name}>
                      <button className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2" onClick={() => openEvidence({ title: i.name, description: `${i.count} reports in ${theme}`, ids: i.recordIds })}>
                        <span className="flex-1 text-sm text-ink">{i.name}</span>
                        <SeverityBadge severity={i.severity} />
                        <span className="w-8 text-right text-sm text-ink-2 tabular">{i.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 pb-6 text-sm text-ink-3">No problems detected in this theme.</p>
              )}
            </Card>
            <Card>
              <CardHeader title="Supporting feedback" subtitle={`${d.current.length} records, newest first`} />
              <ul className="divide-y divide-border border-t border-border">
                {d.current.slice(0, limit).map((r) => (
                  <li key={r.id}>
                    <FeedbackRow record={r} fresh={freshIds.has(r.id)} onOpen={() => openFeedback(r.id)} />
                  </li>
                ))}
              </ul>
              {d.current.length > limit && (
                <div className="border-t border-border p-3 text-center">
                  <Button variant="ghost" onClick={() => setLimit((l) => l + 10)}>
                    Show more
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {d.insights.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-ink">Insights for this theme</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {d.insights.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-ink-2">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink tabular">{value}</p>
    </Card>
  )
}
