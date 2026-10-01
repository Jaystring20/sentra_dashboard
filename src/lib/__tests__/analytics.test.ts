import { describe, expect, it } from 'vitest'
import { comparisonWindows, computeKpis, detectAlerts, detectInsights, inRange, issueStats, rangeFor, sentimentCounts, themeStats, timeSeries } from '../analytics'
import { generateDemoFeedback } from '../data/demo'
import type { FeedbackRecord } from '../types'

const now = new Date('2026-10-01T18:00:00Z')
const records = generateDemoFeedback(now)
const byId = new Map(records.map((r) => [r.id, r]))

function rec(p: Partial<FeedbackRecord> & { id: string; received_at: string }): FeedbackRecord {
  return {
    original_message: 'msg', subject: null, source: 'Gmail', customer_name: null, customer_email: null,
    sentiment: 'neutral', sentiment_score: 0, category: 'Complaint', theme: 'Delivery', issue: null,
    severity: 'low', ai_summary: '', status: 'new', created_at: p.received_at, ...p,
  }
}

describe('ranges and KPIs', () => {
  it('filters records to the selected range', () => {
    const range = rangeFor('7d', records, now)
    const cur = inRange(records, range.from, range.to)
    expect(cur.length).toBeGreaterThan(0)
    expect(cur.every((r) => Date.parse(r.received_at) >= range.from.getTime())).toBe(true)
  })

  it('computes counts and deltas vs previous period', () => {
    const cur = [rec({ id: 'a', received_at: now.toISOString(), sentiment: 'positive', sentiment_score: 1 })]
    const prev = Array.from({ length: 5 }, (_, i) => rec({ id: `p${i}`, received_at: now.toISOString(), sentiment: 'negative', sentiment_score: -1 }))
    const k = computeKpis(cur, prev)
    expect(k.total.value).toBe(1)
    expect(k.total.delta).toBeCloseTo(-0.8)
    expect(k.avgScore.delta).toBeCloseTo(2)
    expect(computeKpis(cur, []).total.delta).toBeNull()
  })

  it('time series buckets account for every record in range', () => {
    const range = rangeFor('30d', records, now)
    const cur = inRange(records, range.from, range.to)
    const series = timeSeries(cur, range)
    expect(series.reduce((s, b) => s + b.total, 0)).toBe(cur.length)
    expect(series.length).toBe(30)
  })

  it('falls back to splitting the range when there is no earlier data', () => {
    const range = rangeFor('all', records, now)
    const cmp = comparisonWindows(records, range)
    expect(cmp.split).toBe(true)
    expect(cmp.previous.length).toBeGreaterThan(0)
  })
})

describe('themes and issues', () => {
  const range = rangeFor('30d', records, now)
  const cur = inRange(records, range.from, range.to)
  const cmp = comparisonWindows(records, range)

  it('theme shares sum to 1 and counts match sentiment', () => {
    const themes = themeStats(cur, cmp)
    expect(themes.reduce((s, t) => s + t.share, 0)).toBeCloseTo(1)
    for (const t of themes) expect(t.positive + t.neutral + t.negative).toBe(t.count)
  })

  it('issue stats are traceable and detection dates ordered', () => {
    for (const i of issueStats(cur, records, cmp, now)) {
      expect(i.recordIds.length).toBe(i.count)
      expect(i.recordIds.every((id) => byId.get(id)?.issue === i.name)).toBe(true)
      expect(i.firstDetected <= i.lastDetected).toBe(true)
    }
  })
})

describe('insights and alerts', () => {
  const range = rangeFor('30d', records, now)

  it('every insight is backed by matching feedback', () => {
    const insights = detectInsights(records, range)
    expect(insights.length).toBeGreaterThan(0)
    for (const i of insights) {
      expect(i.evidenceIds.length).toBeGreaterThan(0)
      const ev = i.evidenceIds.map((id) => byId.get(id)!)
      if (i.issue) expect(ev.every((r) => r.issue === i.issue)).toBe(true)
      if (i.kind === 'positive') expect(ev.every((r) => r.sentiment === 'positive')).toBe(true)
    }
    expect(new Set(insights.map((i) => i.kind))).toEqual(new Set(['emerging', 'recurring', 'positive', 'risk']))
  })

  it('detects the planted rising support complaint', () => {
    const insights = detectInsights(records, range)
    expect(insights.some((i) => i.kind === 'emerging' && i.issue === 'Slow support response time')).toBe(true)
  })

  it('raises a negative-increase alert when negatives jump', () => {
    const base = new Date('2026-10-01T12:00:00Z').getTime()
    const day = 86_400_000
    const data = [
      ...Array.from({ length: 2 }, (_, i) => rec({ id: `o${i}`, received_at: new Date(base - 10 * day).toISOString(), sentiment: 'negative', sentiment_score: -0.8 })),
      ...Array.from({ length: 8 }, (_, i) => rec({ id: `n${i}`, received_at: new Date(base - day).toISOString(), sentiment: 'negative', sentiment_score: -0.8 })),
    ]
    const alerts = detectAlerts(data, rangeFor('7d', data, new Date(base)), new Date(base))
    const a = alerts.find((x) => x.rule === 'negative_increase')
    expect(a).toBeDefined()
    expect(a!.evidenceIds).toHaveLength(8)
    expect(sentimentCounts(a!.evidenceIds.map((id) => data.find((r) => r.id === id)!)).negative).toBe(8)
  })
})
