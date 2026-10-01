import { useMemo, useState } from 'react'
import { Legend, SENTIMENT_COLOR, SENTIMENT_LEGEND, ScoreLineChart, SentimentBar, SentimentStackChart, VolumeChart } from '../components/charts'
import { Card, CardHeader, EmptyState, PageHeader, Select } from '../components/ui'
import { KpiCard, rangeLabel } from '../components/widgets'
import { computeKpis, inRange, previousRange, sentimentBy, sentimentCounts, timeSeries } from '../lib/analytics'
import { useData, usePanels } from '../lib/store'
import type { FeedbackRecord } from '../lib/types'

export function SentimentByTable({ records, dimension, label }: { records: FeedbackRecord[]; dimension: 'theme' | 'category' | 'source'; label: string }) {
  const { openEvidence } = usePanels()
  const rows = useMemo(() => sentimentBy(records, dimension), [records, dimension])
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead className="text-[11px] tracking-wide text-ink-3 uppercase">
          <tr className="border-b border-border">
            <th className="px-5 py-2 text-left font-medium">{label}</th>
            <th className="px-2 py-2 text-right font-medium">Records</th>
            <th className="w-[40%] px-4 py-2 text-left font-medium">Distribution</th>
            <th className="px-5 py-2 text-right font-medium">Avg score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr
              key={r.name}
              tabIndex={0}
              className="cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
              onClick={() => openEvidence({ title: `${r.name}`, description: `${r.total} records · ${label.toLowerCase()}`, ids: records.filter((x) => x[dimension] === r.name).map((x) => x.id) })}
              onKeyDown={(e) => e.key === 'Enter' && openEvidence({ title: r.name, ids: records.filter((x) => x[dimension] === r.name).map((x) => x.id) })}
            >
              <td className="px-5 py-2.5 text-ink">{r.name}</td>
              <td className="px-2 py-2.5 text-right text-ink-2 tabular">{r.total}</td>
              <td className="px-4 py-2.5">
                <SentimentBar positive={r.positive} neutral={r.neutral} negative={r.negative} />
                <span className="mt-1 block text-[11px] text-ink-3 tabular">
                  {Math.round((r.positive / r.total) * 100)}% pos · {Math.round((r.negative / r.total) * 100)}% neg
                </span>
              </td>
              <td className="px-5 py-2.5 text-right font-medium text-ink tabular">
                {r.avgScore > 0 ? '+' : ''}
                {r.avgScore.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Sentiment() {
  const { records, range, preset } = useData()
  const [theme, setTheme] = useState('')
  const themes = useMemo(() => [...new Set(records.map((r) => r.theme))].sort(), [records])

  const d = useMemo(() => {
    const scoped = theme ? records.filter((r) => r.theme === theme) : records
    const current = inRange(scoped, range.from, range.to)
    const p = previousRange(range)
    const previous = inRange(scoped, p.from, new Date(p.to.getTime() - 1))
    return { current, kpis: computeKpis(current, previous), counts: sentimentCounts(current), series: timeSeries(current, range) }
  }, [records, range, theme])

  const total = d.current.length

  return (
    <>
      <PageHeader
        title="Sentiment"
        description={`${rangeLabel(preset)} · How customers feel, how that is changing, and where it differs.`}
        actions={
          <div className="w-48">
            <Select label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="">All themes</option>
              {themes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
        }
      />
      {total === 0 ? (
        <Card>
          {records.length ? <EmptyState title="No feedback in this period" message="Try a wider date range or a different theme." /> : <EmptyState />}
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Positive" accent={SENTIMENT_COLOR.positive} kpi={d.kpis.positive} share={d.counts.positive / total} />
            <KpiCard label="Neutral" accent={SENTIMENT_COLOR.neutral} kpi={d.kpis.neutral} neutral share={d.counts.neutral / total} />
            <KpiCard label="Negative" accent={SENTIMENT_COLOR.negative} kpi={d.kpis.negative} goodWhenUp={false} share={d.counts.negative / total} />
            <KpiCard label="Average sentiment" kpi={d.kpis.avgScore} format="score" />
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Sentiment over time" subtitle="Feedback volume by sentiment" action={<Legend items={SENTIMENT_LEGEND} />} />
              <div className="px-3 pb-4">
                <SentimentStackChart data={d.series} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Overall distribution" subtitle={`${total.toLocaleString()} records`} />
              <div className="space-y-4 px-5 pb-5">
                {SENTIMENT_LEGEND.map((s) => {
                  const n = d.counts[s.label.toLowerCase() as keyof typeof d.counts]
                  return (
                    <div key={s.label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-ink">{s.label}</span>
                        <span className="text-ink-2 tabular">
                          {n} · {Math.round((n / total) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-2">
                        <div className="h-2 rounded-full" style={{ width: `${(n / total) * 100}%`, background: s.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          <Card className="mb-4">
            <CardHeader title="Average sentiment score" subtitle="−1 very negative · 0 neutral · +1 very positive" />
            <div className="px-3 pb-4">
              <ScoreLineChart data={d.series} height={220} />
            </div>
          </Card>

          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Positive feedback trend" subtitle="Positive records per period" />
              <div className="px-3 pb-4">
                <VolumeChart data={d.series} dataKey="positive" color={SENTIMENT_COLOR.positive} name="Positive" height={200} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Negative feedback trend" subtitle="Negative records per period" />
              <div className="px-3 pb-4">
                <VolumeChart data={d.series} dataKey="negative" color={SENTIMENT_COLOR.negative} name="Negative" height={200} />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader title="Sentiment by theme" subtitle="Select a row to see the feedback" />
              <SentimentByTable records={d.current} dimension="theme" label="Theme" />
            </Card>
            <Card>
              <CardHeader title="Sentiment by category" subtitle="Select a row to see the feedback" />
              <SentimentByTable records={d.current} dimension="category" label="Category" />
            </Card>
          </div>
        </>
      )}
    </>
  )
}
