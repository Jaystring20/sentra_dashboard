import type { FeedbackRecord, IssueStatus, Sentiment, Severity } from './types'
import { SEVERITY_RANK } from './types'

/* ------------------------------------------------------------------ ranges */

export type RangePreset = '7d' | '30d' | '90d' | 'all'

export interface DateRange {
  preset: RangePreset
  from: Date
  to: Date
}

const DAY = 86_400_000

export function rangeFor(preset: RangePreset, records: FeedbackRecord[], now = new Date()): DateRange {
  const to = now
  if (preset === 'all') {
    const earliest = records.reduce((m, r) => Math.min(m, Date.parse(r.received_at)), now.getTime())
    return { preset, from: startOfDay(new Date(earliest)), to }
  }
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  return { preset, from: startOfDay(new Date(now.getTime() - (days - 1) * DAY)), to }
}

export function previousRange(range: DateRange): { from: Date; to: Date } {
  const span = range.to.getTime() - range.from.getTime()
  return { from: new Date(range.from.getTime() - span), to: new Date(range.from.getTime()) }
}

export function inRange(records: FeedbackRecord[], from: Date, to: Date) {
  const a = from.getTime()
  const b = to.getTime()
  return records.filter((r) => {
    const t = Date.parse(r.received_at)
    return t >= a && t <= b
  })
}

/**
 * Current vs. comparison window used for trends and insights. When there is no
 * data before the selected range (e.g. "All time"), the range is split in half.
 */
export function comparisonWindows(all: FeedbackRecord[], range: DateRange) {
  const current = inRange(all, range.from, range.to)
  const prev = previousRange(range)
  const previous = inRange(all, prev.from, new Date(prev.to.getTime() - 1))
  if (previous.length > 0) return { current, previous, label: 'vs previous period', split: false }
  const mid = new Date((range.from.getTime() + range.to.getTime()) / 2)
  return {
    current: inRange(all, mid, range.to),
    previous: inRange(all, range.from, new Date(mid.getTime() - 1)),
    label: 'vs first half of range',
    split: true,
  }
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/* -------------------------------------------------------------------- KPIs */

export interface SentimentCounts {
  positive: number
  neutral: number
  negative: number
}

export function sentimentCounts(records: FeedbackRecord[]): SentimentCounts {
  const c = { positive: 0, neutral: 0, negative: 0 }
  for (const r of records) c[r.sentiment]++
  return c
}

export function avgScore(records: FeedbackRecord[]) {
  if (!records.length) return null
  return records.reduce((s, r) => s + r.sentiment_score, 0) / records.length
}

export interface Kpi {
  value: number | null
  previous: number | null
  /** relative change for counts, absolute change for scores */
  delta: number | null
}

function kpi(value: number | null, previous: number | null, relative: boolean, hasPrev: boolean): Kpi {
  if (!hasPrev || value == null || previous == null) return { value, previous: null, delta: null }
  if (relative) return { value, previous, delta: previous === 0 ? null : (value - previous) / previous }
  return { value, previous, delta: value - previous }
}

export function computeKpis(current: FeedbackRecord[], previous: FeedbackRecord[]) {
  const c = sentimentCounts(current)
  const p = sentimentCounts(previous)
  const hasPrev = previous.length >= 5
  return {
    total: kpi(current.length, previous.length, true, hasPrev),
    positive: kpi(c.positive, p.positive, true, hasPrev),
    neutral: kpi(c.neutral, p.neutral, true, hasPrev),
    negative: kpi(c.negative, p.negative, true, hasPrev),
    avgScore: kpi(avgScore(current), avgScore(previous), false, hasPrev),
  }
}

/* --------------------------------------------------------------- time series */

export type Granularity = 'day' | 'week' | 'month'

export interface Bucket extends SentimentCounts {
  key: string
  label: string
  start: number
  total: number
  avgScore: number | null
}

export function granularityFor(range: { from: Date; to: Date }): Granularity {
  const days = (range.to.getTime() - range.from.getTime()) / DAY
  return days <= 35 ? 'day' : days <= 200 ? 'week' : 'month'
}

export function bucketStart(t: number, g: Granularity) {
  const d = startOfDay(new Date(t))
  if (g === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  if (g === 'month') d.setDate(1)
  return d
}

function bucketLabel(d: Date, g: Granularity) {
  if (g === 'month') return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function timeSeries(records: FeedbackRecord[], range: { from: Date; to: Date }, g = granularityFor(range)): Bucket[] {
  const buckets = new Map<number, Bucket & { scoreSum: number }>()
  for (let d = bucketStart(range.from.getTime(), g); d.getTime() <= range.to.getTime(); ) {
    const key = d.getTime()
    buckets.set(key, { key: String(key), label: bucketLabel(d, g), start: key, total: 0, positive: 0, neutral: 0, negative: 0, avgScore: null, scoreSum: 0 })
    if (g === 'day') d.setDate(d.getDate() + 1)
    else if (g === 'week') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
  }
  for (const r of records) {
    const b = buckets.get(bucketStart(Date.parse(r.received_at), g).getTime())
    if (!b) continue
    b.total++
    b[r.sentiment]++
    b.scoreSum += r.sentiment_score
  }
  return [...buckets.values()].map(({ scoreSum, ...b }) => ({ ...b, avgScore: b.total ? +(scoreSum / b.total).toFixed(3) : null }))
}

/* ------------------------------------------------------------- dimensions */

export function countBy<K extends keyof FeedbackRecord>(records: FeedbackRecord[], key: K) {
  const m = new Map<string, number>()
  for (const r of records) {
    const v = r[key]
    if (v == null || v === '') continue
    m.set(String(v), (m.get(String(v)) ?? 0) + 1)
  }
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}

export function sentimentBy<K extends keyof FeedbackRecord>(records: FeedbackRecord[], key: K) {
  const m = new Map<string, FeedbackRecord[]>()
  for (const r of records) {
    const v = r[key]
    if (v == null || v === '') continue
    const list = m.get(String(v)) ?? []
    list.push(r)
    m.set(String(v), list)
  }
  return [...m.entries()]
    .map(([name, rs]) => ({ name, total: rs.length, ...sentimentCounts(rs), avgScore: avgScore(rs) ?? 0 }))
    .sort((a, b) => b.total - a.total)
}

function pctChange(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? null : 0
  return (cur - prev) / prev
}

/* ------------------------------------------------------------------ themes */

export interface ThemeStat extends SentimentCounts {
  name: string
  count: number
  share: number
  avgScore: number
  previousCount: number
  /** relative change vs comparison window; null = new */
  trend: number | null
  relatedIssues: { name: string; count: number }[]
  categories: { name: string; count: number }[]
  recordIds: string[]
}

export function themeStats(records: FeedbackRecord[], cmp: { current: FeedbackRecord[]; previous: FeedbackRecord[] }): ThemeStat[] {
  const groups = groupBy(records, (r) => r.theme)
  const curCount = countMap(cmp.current, (r) => r.theme)
  const prevCount = countMap(cmp.previous, (r) => r.theme)
  return [...groups.entries()]
    .map(([name, rs]) => ({
      name,
      count: rs.length,
      share: rs.length / Math.max(1, records.length),
      ...sentimentCounts(rs),
      avgScore: avgScore(rs) ?? 0,
      previousCount: prevCount.get(name) ?? 0,
      trend: pctChange(curCount.get(name) ?? 0, prevCount.get(name) ?? 0),
      relatedIssues: countBy(rs, 'issue').slice(0, 5),
      categories: countBy(rs, 'category'),
      recordIds: rs.map((r) => r.id),
    }))
    .sort((a, b) => b.count - a.count)
}

/* ------------------------------------------------------------------ issues */

export interface IssueStat extends SentimentCounts {
  name: string
  theme: string
  count: number
  severity: Severity
  avgScore: number
  firstDetected: string
  lastDetected: string
  trend: number | null
  previousCount: number
  derivedStatus: IssueStatus
  recordIds: string[]
}

export function issueStats(records: FeedbackRecord[], all: FeedbackRecord[], cmp: { current: FeedbackRecord[]; previous: FeedbackRecord[] }, now = new Date()): IssueStat[] {
  const withIssue = records.filter((r) => r.issue)
  const groups = groupBy(withIssue, (r) => r.issue as string)
  const firstSeen = new Map<string, string>()
  for (const r of all) {
    if (!r.issue) continue
    const f = firstSeen.get(r.issue)
    if (!f || r.received_at < f) firstSeen.set(r.issue, r.received_at)
  }
  const curCount = countMap(cmp.current, (r) => r.issue ?? '')
  const prevCount = countMap(cmp.previous, (r) => r.issue ?? '')
  return [...groups.entries()]
    .map(([name, rs]) => {
      const sorted = [...rs].sort((a, b) => a.received_at.localeCompare(b.received_at))
      const severity = rs.reduce<Severity>((m, r) => (SEVERITY_RANK[r.severity] > SEVERITY_RANK[m] ? r.severity : m), 'low')
      const trend = pctChange(curCount.get(name) ?? 0, prevCount.get(name) ?? 0)
      const first = firstSeen.get(name) ?? sorted[0].received_at
      const allResolved = rs.every((r) => r.status === 'resolved')
      const derivedStatus: IssueStatus = allResolved
        ? 'resolved'
        : now.getTime() - Date.parse(first) < 7 * DAY
          ? 'new'
          : (trend ?? 1) > 0.25 || SEVERITY_RANK[severity] >= 3
            ? 'investigating'
            : 'monitoring'
      return {
        name,
        theme: mode(rs.map((r) => r.theme)),
        count: rs.length,
        severity,
        ...sentimentCounts(rs),
        avgScore: avgScore(rs) ?? 0,
        firstDetected: first,
        lastDetected: sorted[sorted.length - 1].received_at,
        trend,
        previousCount: prevCount.get(name) ?? 0,
        derivedStatus,
        recordIds: rs.map((r) => r.id),
      }
    })
    .sort((a, b) => b.count - a.count || SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
}

/* ---------------------------------------------------------------- insights */

export type InsightKind = 'emerging' | 'recurring' | 'positive' | 'risk'

export interface Insight {
  id: string
  kind: InsightKind
  title: string
  description: string
  metric: string
  confidence: 'high' | 'medium' | 'low'
  theme?: string
  issue?: string
  evidenceIds: string[]
}

function confidenceFor(n: number): Insight['confidence'] {
  return n >= 12 ? 'high' : n >= 5 ? 'medium' : 'low'
}

const pct = (x: number) => `${Math.round(x * 100)}%`

/**
 * Rule-based pattern detection over the analyzed records. Each insight keeps
 * the ids of the feedback that produced it, so it can always be traced back.
 */
export function detectInsights(all: FeedbackRecord[], range: DateRange): Insight[] {
  const records = inRange(all, range.from, range.to)
  const cmp = comparisonWindows(all, range)
  const themes = themeStats(records, cmp)
  const issues = issueStats(records, all, cmp)
  const out: Insight[] = []

  // Emerging trends: issues / themes growing in the most recent window.
  for (const i of issues) {
    const recent = cmp.current.filter((r) => r.issue === i.name)
    const grew = i.previousCount === 0 ? recent.length >= 3 : recent.length >= 3 && recent.length >= i.previousCount * 1.5
    if (!grew) continue
    out.push({
      id: `emerging-issue-${i.name}`,
      kind: 'emerging',
      title: `"${i.name}" is becoming more frequent`,
      description:
        i.previousCount === 0
          ? `${recent.length} reports in the latest window with none in the comparison window. This is a newly emerging pattern within ${i.theme}.`
          : `Reports rose from ${i.previousCount} to ${recent.length} (${cmp.label}). Customers increasingly mention this within ${i.theme}.`,
      metric: i.previousCount === 0 ? 'New' : `+${pct((recent.length - i.previousCount) / i.previousCount)}`,
      confidence: confidenceFor(recent.length),
      theme: i.theme,
      issue: i.name,
      evidenceIds: recent.map((r) => r.id),
    })
  }
  for (const t of themes) {
    const recent = cmp.current.filter((r) => r.theme === t.name)
    if (t.previousCount < 3 || recent.length < t.previousCount * 1.4 || recent.length < 6) continue
    if (out.some((o) => o.kind === 'emerging' && o.theme === t.name)) continue
    out.push({
      id: `emerging-theme-${t.name}`,
      kind: 'emerging',
      title: `${t.name} is drawing more attention`,
      description: `Mentions of ${t.name} increased from ${t.previousCount} to ${recent.length} (${cmp.label}).`,
      metric: `+${pct((recent.length - t.previousCount) / t.previousCount)}`,
      confidence: confidenceFor(recent.length),
      theme: t.name,
      evidenceIds: recent.map((r) => r.id),
    })
  }

  // Recurring problems: issues seen repeatedly across the range.
  for (const i of issues.filter((x) => x.count >= 3).slice(0, 6)) {
    out.push({
      id: `recurring-${i.name}`,
      kind: 'recurring',
      title: i.name,
      description: `Reported ${i.count} times in this period (${pct(i.count / Math.max(1, records.length))} of all feedback), mostly under ${i.theme}. First detected ${fmtDate(i.firstDetected)}, most recently ${fmtDate(i.lastDetected)}.`,
      metric: `${i.count} reports`,
      confidence: confidenceFor(i.count),
      theme: i.theme,
      issue: i.name,
      evidenceIds: i.recordIds,
    })
  }

  // Positive signals: themes customers consistently praise.
  for (const t of themes) {
    const share = t.positive / t.count
    if (t.positive < 3 || share < 0.6) continue
    const praise = records.filter((r) => r.theme === t.name && r.sentiment === 'positive')
    out.push({
      id: `positive-${t.name}`,
      kind: 'positive',
      title: `Customers consistently praise ${t.name}`,
      description: `${pct(share)} of ${t.name} feedback is positive (${t.positive} of ${t.count}). Average sentiment score ${t.avgScore.toFixed(2)}.`,
      metric: `${pct(share)} positive`,
      confidence: confidenceFor(t.positive),
      theme: t.name,
      evidenceIds: praise.map((r) => r.id),
    })
  }

  // Risk signals: high-severity issues and themes turning negative.
  for (const i of issues) {
    if (SEVERITY_RANK[i.severity] < 2 || i.count < 2) continue
    const severe = records.filter((r) => r.issue === i.name && SEVERITY_RANK[r.severity] >= 2)
    out.push({
      id: `risk-issue-${i.name}`,
      kind: 'risk',
      title: `${i.severity === 'critical' ? 'Critical' : 'High-severity'} issue: ${i.name}`,
      description: `${severe.length} ${i.severity}-severity reports with an average sentiment of ${i.avgScore.toFixed(2)}. ${i.trend != null && i.trend > 0.25 ? 'Volume is increasing — ' : ''}prioritise investigation.`,
      metric: `${severe.length} × ${i.severity}`,
      confidence: confidenceFor(severe.length),
      theme: i.theme,
      issue: i.name,
      evidenceIds: severe.map((r) => r.id),
    })
  }
  for (const t of themes) {
    const cur = cmp.current.filter((r) => r.theme === t.name)
    const prev = cmp.previous.filter((r) => r.theme === t.name)
    if (cur.length < 5 || prev.length < 5) continue
    const curNeg = cur.filter((r) => r.sentiment === 'negative').length / cur.length
    const prevNeg = prev.filter((r) => r.sentiment === 'negative').length / prev.length
    if (curNeg - prevNeg < 0.15) continue
    out.push({
      id: `risk-theme-${t.name}`,
      kind: 'risk',
      title: `Sentiment about ${t.name} is deteriorating`,
      description: `Negative share rose from ${pct(prevNeg)} to ${pct(curNeg)} (${cmp.label}).`,
      metric: `+${Math.round((curNeg - prevNeg) * 100)} pts negative`,
      confidence: confidenceFor(cur.length),
      theme: t.name,
      evidenceIds: cur.filter((r) => r.sentiment === 'negative').map((r) => r.id),
    })
  }

  return out
}

/* ------------------------------------------------------------------ alerts */

export type AlertLevel = 'critical' | 'serious' | 'warning'

export interface Alert {
  id: string
  rule: 'negative_increase' | 'new_recurring_issue' | 'sentiment_shift' | 'high_volume_complaint' | 'emerging_negative_theme'
  level: AlertLevel
  title: string
  detail: string
  evidenceIds: string[]
}

export const ALERT_RULES: Record<Alert['rule'], string> = {
  negative_increase: 'Negative feedback up ≥ 25% vs comparison window (min. 5 records)',
  new_recurring_issue: 'Issue first detected in the last 14 days with ≥ 3 reports',
  sentiment_shift: 'Average sentiment moved ≥ 0.15 vs comparison window',
  high_volume_complaint: 'Single issue accounts for ≥ 8% of feedback in the latest window',
  emerging_negative_theme: 'Theme negative share up ≥ 15 pts vs comparison window',
}

export function detectAlerts(all: FeedbackRecord[], range: DateRange, now = new Date()): Alert[] {
  const cmp = comparisonWindows(all, range)
  const out: Alert[] = []
  const curNeg = cmp.current.filter((r) => r.sentiment === 'negative')
  const prevNeg = cmp.previous.filter((r) => r.sentiment === 'negative')

  if (curNeg.length >= 5 && prevNeg.length > 0 && curNeg.length >= prevNeg.length * 1.25) {
    const change = (curNeg.length - prevNeg.length) / prevNeg.length
    out.push({
      id: 'negative_increase',
      rule: 'negative_increase',
      level: change >= 0.6 ? 'critical' : 'serious',
      title: `Negative feedback up ${pct(change)}`,
      detail: `${curNeg.length} negative records vs ${prevNeg.length} (${cmp.label}).`,
      evidenceIds: curNeg.map((r) => r.id),
    })
  }

  const a = avgScore(cmp.current)
  const b = avgScore(cmp.previous)
  if (a != null && b != null && Math.abs(a - b) >= 0.15) {
    out.push({
      id: 'sentiment_shift',
      rule: 'sentiment_shift',
      level: a < b ? 'serious' : 'warning',
      title: `Average sentiment ${a < b ? 'dropped' : 'improved'} by ${Math.abs(a - b).toFixed(2)}`,
      detail: `From ${b.toFixed(2)} to ${a.toFixed(2)} (${cmp.label}).`,
      evidenceIds: (a < b ? curNeg : cmp.current.filter((r) => r.sentiment === 'positive')).map((r) => r.id),
    })
  }

  const issues = issueStats(inRange(all, range.from, range.to), all, cmp, now)
  for (const i of issues) {
    if (now.getTime() - Date.parse(i.firstDetected) <= 14 * DAY && i.count >= 3) {
      out.push({
        id: `new_recurring_issue-${i.name}`,
        rule: 'new_recurring_issue',
        level: SEVERITY_RANK[i.severity] >= 2 ? 'serious' : 'warning',
        title: `New recurring issue: ${i.name}`,
        detail: `First detected ${fmtDate(i.firstDetected)}; ${i.count} reports since.`,
        evidenceIds: i.recordIds,
      })
    }
    const recent = cmp.current.filter((r) => r.issue === i.name)
    if (cmp.current.length >= 10 && recent.length / cmp.current.length >= 0.08) {
      out.push({
        id: `high_volume_complaint-${i.name}`,
        rule: 'high_volume_complaint',
        level: SEVERITY_RANK[i.severity] >= 3 ? 'critical' : 'serious',
        title: `High-volume complaint: ${i.name}`,
        detail: `${recent.length} reports — ${pct(recent.length / cmp.current.length)} of all feedback in the latest window.`,
        evidenceIds: recent.map((r) => r.id),
      })
    }
  }

  for (const ins of detectInsights(all, range).filter((x) => x.id.startsWith('risk-theme-'))) {
    out.push({
      id: `emerging_negative_theme-${ins.theme}`,
      rule: 'emerging_negative_theme',
      level: 'serious',
      title: `Emerging negative theme: ${ins.theme}`,
      detail: ins.description,
      evidenceIds: ins.evidenceIds,
    })
  }

  const order: Record<AlertLevel, number> = { critical: 0, serious: 1, warning: 2 }
  return out.sort((x, y) => order[x.level] - order[y.level])
}

/* ------------------------------------------------------- executive summary */

export function computeExecutiveSummary(all: FeedbackRecord[], range: DateRange) {
  const records = inRange(all, range.from, range.to)
  if (!records.length) return null
  const cmp = comparisonWindows(all, range)
  const c = sentimentCounts(records)
  const themes = themeStats(records, cmp)
  const issues = issueStats(records, all, cmp)
  const insights = detectInsights(all, range)
  const score = avgScore(records) ?? 0
  const mood = score > 0.25 ? 'broadly positive' : score < -0.1 ? 'leaning negative' : 'mixed'
  const topTheme = themes[0]
  const topIssue = issues[0]
  const praise = insights.find((i) => i.kind === 'positive')
  const emerging = insights.find((i) => i.kind === 'emerging')
  const risk = insights.find((i) => i.kind === 'risk')

  const parts = [
    `Sentra analyzed ${records.length} feedback messages. Overall sentiment is ${mood} (${pct(c.positive / records.length)} positive, ${pct(c.negative / records.length)} negative; average score ${score.toFixed(2)}).`,
    topTheme ? `${topTheme.name} is the most discussed theme (${pct(topTheme.share)} of feedback).` : '',
    topIssue ? `The most frequent problem is "${topIssue.name}" with ${topIssue.count} reports.` : '',
    emerging ? `${emerging.title}.` : '',
    praise ? `${praise.title}.` : '',
  ].filter(Boolean)

  const highlights = [risk?.title, emerging?.title, praise?.title].filter((x): x is string => Boolean(x))
  return { summary: parts.join(' '), highlights, generated_at: new Date().toISOString(), origin: 'computed' as const }
}

/* ----------------------------------------------------------------- helpers */

function groupBy<T>(items: T[], key: (t: T) => string) {
  const m = new Map<string, T[]>()
  for (const it of items) {
    const k = key(it)
    const list = m.get(k)
    if (list) list.push(it)
    else m.set(k, [it])
  }
  return m
}

function countMap<T>(items: T[], key: (t: T) => string) {
  const m = new Map<string, number>()
  for (const it of items) {
    const k = key(it)
    if (k) m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

function mode(values: string[]) {
  const m = countMap(values, (v) => v)
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function sentimentLabel(s: Sentiment) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
