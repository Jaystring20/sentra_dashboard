import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { BarList, Legend, MultiLineChart, SENTIMENT_LEGEND, ScoreLineChart, SentimentStackChart, TooltipBox, VolumeChart } from '../components/charts'
import { Card, CardHeader, EmptyState, PageHeader, Segmented } from '../components/ui'
import { rangeLabel } from '../components/widgets'
import { bucketStart, countBy, granularityFor, inRange, timeSeries, type Granularity } from '../lib/analytics'
import { useData } from '../lib/store'
import type { FeedbackRecord } from '../lib/types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function byWeekday(records: FeedbackRecord[]) {
  const counts = WEEKDAYS.map((label) => ({ label, count: 0 }))
  for (const r of records) counts[(new Date(r.received_at).getDay() + 6) % 7].count++
  return counts
}

function byHour(records: FeedbackRecord[]) {
  const counts = Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, '0')}:00`, count: 0 }))
  for (const r of records) counts[new Date(r.received_at).getHours()].count++
  return counts
}

function CountBars({ data, height = 200 }: { data: { label: string; count: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} minTickGap={8} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          cursor={{ fill: 'var(--surface-2)' }}
          content={({ active, payload }: TooltipContentProps) =>
            active && payload?.length ? <TooltipBox title={String(payload[0].payload.label)} rows={[{ label: 'Feedback', value: String(payload[0].value), color: 'var(--s1)' }]} /> : null
          }
        />
        <Bar dataKey="count" fill="var(--s1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Analytics() {
  const { records, range, preset } = useData()
  const [gran, setGran] = useState<Granularity | 'auto'>('auto')
  const [period, setPeriod] = useState<'weekday' | 'hour'>('weekday')

  const d = useMemo(() => {
    const current = inRange(records, range.from, range.to)
    const g = gran === 'auto' ? granularityFor(range) : gran
    const series = timeSeries(current, range, g)
    // Theme trend: top 6 themes, in fixed order by volume.
    const top = countBy(current, 'theme').slice(0, 6).map((t) => t.name)
    // Daily lines for six themes are unreadable; the theme trend never goes finer than weekly.
    const tg: Granularity = g === 'day' && range.to.getTime() - range.from.getTime() > 14 * 86_400_000 ? 'week' : g
    const themeBuckets = tg === g ? series : timeSeries(current, range, tg)
    const themeSeries = themeBuckets.map((b) => {
      const inBucket = current.filter((r) => bucketStart(Date.parse(r.received_at), tg).getTime() === b.start)
      const row: Record<string, number | string> = { label: b.label }
      for (const name of top) row[name] = inBucket.filter((r) => r.theme === name).length
      return row
    })
    return {
      current,
      series,
      top,
      themeSeries,
      issues: countBy(current, 'issue').slice(0, 10),
      categories: countBy(current, 'category'),
      sources: countBy(current, 'source'),
    }
  }, [records, range, gran])

  const total = d.current.length

  return (
    <>
      <PageHeader
        title="Analytics"
        description={`${rangeLabel(preset)} · Deeper reporting across volume, sentiment, themes, issues and sources.`}
        actions={
          <Segmented
            label="Granularity"
            value={gran}
            onChange={setGran}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'day', label: 'Daily' },
              { value: 'week', label: 'Weekly' },
              { value: 'month', label: 'Monthly' },
            ]}
          />
        }
      />
      {!total ? (
        <Card>{records.length ? <EmptyState title="No feedback in this period" message="Choose a wider date range." /> : <EmptyState />}</Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Feedback volume" subtitle={`${total.toLocaleString()} records`} />
            <div className="px-3 pb-4">
              <VolumeChart data={d.series} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Sentiment trend" subtitle="Average score per period (−1 to +1)" />
            <div className="px-3 pb-4">
              <ScoreLineChart data={d.series} />
            </div>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Theme trend" subtitle="Mentions per period for the six most-discussed themes · hover the legend to isolate" />
            <div className="px-3 pb-4">
              <MultiLineChart data={d.themeSeries} series={d.top} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Issue frequency" subtitle="Top 10 recurring problems" />
            <div className="px-3 pb-4">{d.issues.length ? <BarList items={d.issues} color="var(--neg)" /> : <p className="px-2 py-6 text-center text-sm text-ink-3">No issues detected.</p>}</div>
          </Card>
          <Card>
            <CardHeader title="Sentiment by period" action={<Legend items={SENTIMENT_LEGEND} />} />
            <div className="px-3 pb-4">
              <SentimentStackChart data={d.series} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Category distribution" subtitle="How the AI classified feedback" />
            <div className="px-3 pb-4">
              <BarList items={d.categories.map((c) => ({ ...c, hint: `${Math.round((c.count / total) * 100)}%` }))} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Source distribution" subtitle="Where feedback came from" />
            <div className="px-3 pb-4">
              <BarList items={d.sources.map((c) => ({ ...c, hint: `${Math.round((c.count / total) * 100)}%` }))} />
            </div>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader
              title="Feedback by time period"
              subtitle="When customers get in touch"
              action={
                <Segmented
                  label="Period"
                  value={period}
                  onChange={setPeriod}
                  options={[
                    { value: 'weekday', label: 'Day of week' },
                    { value: 'hour', label: 'Hour of day' },
                  ]}
                />
              }
            />
            <div className="px-3 pb-4">
              <CountBars data={period === 'weekday' ? byWeekday(d.current) : byHour(d.current)} />
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
