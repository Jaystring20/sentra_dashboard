import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarList, SENTIMENT_COLOR, SENTIMENT_LEGEND, SentimentBar, VolumeChart } from '../components/charts'
import { FeedbackRow } from '../components/Drawers'
import { Card, CardHeader, EmptyState, PageHeader } from '../components/ui'
import { ExecutiveSummaryCard, KpiCard, PipelineStrip, rangeLabel } from '../components/widgets'
import { comparisonWindows, computeKpis, inRange, issueStats, previousRange, sentimentCounts, themeStats, timeSeries } from '../lib/analytics'
import { useData, usePanels } from '../lib/store'

export function Overview() {
  const { records, range, preset, freshIds } = useData()
  const { openFeedback, openEvidence } = usePanels()
  const navigate = useNavigate()

  const data = useMemo(() => {
    const current = inRange(records, range.from, range.to)
    const prev = previousRange(range)
    const previous = inRange(records, prev.from, new Date(prev.to.getTime() - 1))
    const cmp = comparisonWindows(records, range)
    return {
      current,
      kpis: computeKpis(current, previous),
      counts: sentimentCounts(current),
      series: timeSeries(current, range),
      themes: themeStats(current, cmp).slice(0, 6),
      issues: issueStats(current, records, cmp).slice(0, 6),
    }
  }, [records, range])

  if (!records.length) {
    return (
      <>
        <PageHeader title="Overview" />
        <Card>
          <EmptyState />
        </Card>
      </>
    )
  }

  const { kpis, counts, current } = data
  const total = current.length

  return (
    <>
      <PageHeader title="Overview" description={`${rangeLabel(preset)} · What customers are saying, how they feel, and what keeps coming up.`} />

      <div className="mb-4">
        <PipelineStrip compact />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total feedback" kpi={kpis.total} neutral />
        <KpiCard label="Positive" accent={SENTIMENT_COLOR.positive} kpi={kpis.positive} share={total ? counts.positive / total : null} />
        <KpiCard label="Neutral" accent={SENTIMENT_COLOR.neutral} kpi={kpis.neutral} neutral share={total ? counts.neutral / total : null} />
        <KpiCard label="Negative" accent={SENTIMENT_COLOR.negative} kpi={kpis.negative} goodWhenUp={false} share={total ? counts.negative / total : null} />
        <KpiCard label="Average sentiment" kpi={kpis.avgScore} format="score" />
      </div>

      {total === 0 ? (
        <Card>
          <EmptyState title="No feedback in this period" message="No feedback was received in the selected date range. Choose a wider range to see insights." />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Feedback trend" subtitle="Feedback volume over time" />
              <div className="px-3 pb-4">
                <VolumeChart data={data.series} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Sentiment breakdown" subtitle={`${total.toLocaleString()} records`} />
              <div className="px-5 pb-5">
                <SentimentBar {...counts} className="h-3" />
                <ul className="mt-5 space-y-3">
                  {SENTIMENT_LEGEND.map((s) => {
                    const key = s.label.toLowerCase() as keyof typeof counts
                    return (
                      <li key={s.label}>
                        <button
                          className="flex w-full items-center justify-between rounded-md px-1 py-1 text-sm hover:bg-surface-2"
                          onClick={() => navigate(`/feedback?sentiment=${key}`)}
                        >
                          <span className="flex items-center gap-2 text-ink">
                            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
                            {s.label}
                          </span>
                          <span className="tabular text-ink-2">
                            <span className="font-semibold text-ink">{counts[key]}</span>
                            <span className="ml-2 inline-block w-10 text-right">{Math.round((counts[key] / total) * 100)}%</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            <ExecutiveSummaryCard className="lg:col-span-1" />
            <Card>
              <CardHeader
                title="Top themes"
                subtitle="Most frequently detected"
                action={
                  <Link to="/themes" className="text-xs font-medium text-accent-text hover:underline">
                    All themes
                  </Link>
                }
              />
              <div className="px-3 pb-4">
                <BarList
                  items={data.themes.map((t) => ({ name: t.name, count: t.count, hint: `${Math.round(t.share * 100)}%` }))}
                  onSelect={(name) => navigate(`/themes/${encodeURIComponent(name)}`)}
                />
              </div>
            </Card>
            <Card>
              <CardHeader
                title="Top issues"
                subtitle="Recurring customer problems"
                action={
                  <Link to="/issues" className="text-xs font-medium text-accent-text hover:underline">
                    All issues
                  </Link>
                }
              />
              <div className="px-3 pb-4">
                {data.issues.length ? (
                  <BarList
                    color="var(--neg)"
                    items={data.issues.map((i) => ({ name: i.name, count: i.count }))}
                    onSelect={(name) => {
                      const i = data.issues.find((x) => x.name === name)
                      if (i) openEvidence({ title: i.name, description: `${i.count} reports · ${i.theme}`, ids: i.recordIds })
                    }}
                  />
                ) : (
                  <p className="px-2 py-6 text-center text-sm text-ink-3">No recurring issues detected.</p>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Recent customer voice"
              subtitle="Latest analyzed feedback"
              action={
                <Link to="/feedback" className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">
                  View all <ArrowRight size={12} />
                </Link>
              }
            />
            <ul className="divide-y divide-border border-t border-border">
              {current.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <FeedbackRow record={r} fresh={freshIds.has(r.id)} onOpen={() => openFeedback(r.id)} />
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  )
}
