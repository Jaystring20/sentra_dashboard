import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { Bucket } from '../lib/analytics'
import type { Sentiment } from '../lib/types'

export const SENTIMENT_COLOR: Record<Sentiment, string> = { positive: 'var(--pos)', neutral: 'var(--neu)', negative: 'var(--neg)' }
export const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)']

const axisProps = { axisLine: false, tickLine: false, tickMargin: 8 } as const

/* ----------------------------------------------------------------- tooltip */

interface Row {
  label: string
  value: string
  color?: string
}

export function TooltipBox({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="min-w-36 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-ink">{title}</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-ink-2">
            {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="tabular font-medium text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

function bucketTooltip(showSentiment: boolean) {
  return function BucketTooltip({ active, payload }: TooltipContentProps) {
    if (!active || !payload?.length) return null
    const b = payload[0].payload as Bucket
    const rows: Row[] = showSentiment
      ? [
          { label: 'Positive', value: String(b.positive), color: SENTIMENT_COLOR.positive },
          { label: 'Neutral', value: String(b.neutral), color: SENTIMENT_COLOR.neutral },
          { label: 'Negative', value: String(b.negative), color: SENTIMENT_COLOR.negative },
          { label: 'Total', value: String(b.total) },
        ]
      : [
          { label: 'Feedback', value: String(b.total) },
          { label: 'Avg sentiment', value: b.avgScore == null ? '—' : b.avgScore.toFixed(2) },
        ]
    return <TooltipBox title={b.label} rows={rows} />
  }
}

/* ------------------------------------------------------------ chart frames */

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

export const SENTIMENT_LEGEND = [
  { label: 'Positive', color: SENTIMENT_COLOR.positive },
  { label: 'Neutral', color: SENTIMENT_COLOR.neutral },
  { label: 'Negative', color: SENTIMENT_COLOR.negative },
]

/** A single count series over time (defaults to total feedback volume). */
export function VolumeChart({ data, height = 240, dataKey = 'total', color = 'var(--s1)', name = 'Feedback' }: { data: Bucket[]; height?: number; dataKey?: 'total' | Sentiment; color?: string; name?: string }) {
  const gid = `fill-${dataKey}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" {...axisProps} minTickGap={24} />
        <YAxis allowDecimals={false} {...axisProps} width={44} />
        <Tooltip
          cursor={{ stroke: 'var(--border-strong)' }}
          content={({ active, payload }: TooltipContentProps) => {
            if (!active || !payload?.length) return null
            const b = payload[0].payload as Bucket
            return <TooltipBox title={b.label} rows={[{ label: name, value: String(b[dataKey]), color }, ...(dataKey === 'total' ? [] : [{ label: 'Share of period', value: b.total ? `${Math.round((b[dataKey] / b.total) * 100)}%` : '—' }])]} />
          }}
        />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2} fill={`url(#${gid})`} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Stacked sentiment volume per period. */
export function SentimentStackChart({ data, height = 260 }: { data: Bucket[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap="20%">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" {...axisProps} minTickGap={24} />
        <YAxis allowDecimals={false} {...axisProps} width={44} />
        <Tooltip content={bucketTooltip(true)} cursor={{ fill: 'var(--surface-2)' }} />
        <Bar dataKey="negative" stackId="s" fill={SENTIMENT_COLOR.negative} stroke="var(--surface)" strokeWidth={1} />
        <Bar dataKey="neutral" stackId="s" fill={SENTIMENT_COLOR.neutral} stroke="var(--surface)" strokeWidth={1} />
        <Bar dataKey="positive" stackId="s" fill={SENTIMENT_COLOR.positive} stroke="var(--surface)" strokeWidth={1} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Average sentiment score over time on a fixed -1..1 axis. */
export function ScoreLineChart({ data, height = 240 }: { data: Bucket[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" {...axisProps} minTickGap={24} />
        <YAxis domain={[-1, 1]} ticks={[-1, -0.5, 0, 0.5, 1]} tickFormatter={(v: number) => (v > 0 ? `+${v}` : String(v))} {...axisProps} width={44} />
        <ReferenceLine y={0} stroke="var(--border-strong)" />
        <Tooltip content={bucketTooltip(false)} cursor={{ stroke: 'var(--border-strong)' }} />
        <Line type="monotone" dataKey="avgScore" name="Avg sentiment" stroke="var(--s1)" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Multi-series line chart for up to 8 named series (fixed color order). */
export function MultiLineChart({ data, series, height = 260 }: { data: Record<string, number | string>[]; series: string[]; height?: number }) {
  const [hover, setHover] = useState<string | null>(null)
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...axisProps} minTickGap={24} />
          <YAxis allowDecimals={false} {...axisProps} width={44} />
          <Tooltip
            cursor={{ stroke: 'var(--border-strong)' }}
            content={({ active, payload, label }: TooltipContentProps) =>
              active && payload?.length ? (
                <TooltipBox
                  title={String(label)}
                  rows={[...payload]
                    .sort((a, b) => Number(b.value) - Number(a.value))
                    .map((p) => ({ label: String(p.name), value: String(p.value), color: String(p.color) }))}
                />
              ) : null
            }
          />
          {series.map((s, i) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              stroke={SERIES[i % SERIES.length]}
              strokeWidth={2}
              strokeOpacity={hover && hover !== s ? 0.2 : 1}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {series.map((s, i) => (
          <button key={s} className="inline-flex items-center gap-1.5 hover:text-ink" onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(s)} onBlur={() => setHover(null)}>
            <span className="h-0.5 w-3 rounded" style={{ background: SERIES[i % SERIES.length] }} />
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- html bar list */

/** Ranked horizontal bars rendered in HTML: labels stay legible at any width. */
export function BarList({
  items,
  onSelect,
  color = 'var(--s1)',
  valueFormat = (n: number) => String(n),
  max,
}: {
  items: { name: string; count: number; hint?: string }[]
  onSelect?: (name: string) => void
  color?: string
  valueFormat?: (n: number) => string
  max?: number
}) {
  const top = max ?? Math.max(1, ...items.map((i) => i.count))
  return (
    <ul className="space-y-1">
      {items.map((it) => {
        const inner = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-ink">{it.name}</span>
              <span className="shrink-0 tabular text-ink-2">
                {valueFormat(it.count)}
                {it.hint && <span className="ml-1.5 text-xs text-ink-3">{it.hint}</span>}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-2">
              <div className="h-1.5 rounded-full" style={{ width: `${Math.max(2, (it.count / top) * 100)}%`, background: color }} />
            </div>
          </>
        )
        return (
          <li key={it.name}>
            {onSelect ? (
              <button className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-surface-2" onClick={() => onSelect(it.name)}>
                {inner}
              </button>
            ) : (
              <div className="px-2 py-1.5">{inner}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** 100% stacked sentiment bar with a hover tooltip. */
export function SentimentBar({ positive, neutral, negative, className = 'h-2' }: { positive: number; neutral: number; negative: number; className?: string }) {
  const total = positive + neutral + negative || 1
  const parts: [Sentiment, number][] = [
    ['positive', positive],
    ['neutral', neutral],
    ['negative', negative],
  ]
  const title = parts.map(([s, n]) => `${s}: ${n} (${Math.round((n / total) * 100)}%)`).join(' · ')
  return (
    <div className={`flex w-full gap-0.5 overflow-hidden rounded-full ${className}`} title={title} role="img" aria-label={title}>
      {parts.map(([s, n]) => (n > 0 ? <div key={s} style={{ width: `${(n / total) * 100}%`, background: SENTIMENT_COLOR[s] }} /> : null))}
    </div>
  )
}
