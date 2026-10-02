import type { FeedbackRecord, FeedbackStatus, Sentiment, Severity } from '../types'

/**
 * n8n + LLM output is not always perfectly shaped (capitalised labels, scores on
 * different scales, missing fields). Normalise every database row into the
 * FeedbackRecord shape the dashboard relies on.
 */

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v))
const nullable = (v: unknown) => str(v) || null

function titleCase(v: string) {
  return v.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())
}

export function normalizeSentiment(v: unknown, score?: number): Sentiment {
  const s = str(v).toLowerCase()
  if (s.startsWith('pos')) return 'positive'
  if (s.startsWith('neg')) return 'negative'
  if (s.startsWith('neu') || s === 'mixed') return 'neutral'
  if (score != null) return score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral'
  return 'neutral'
}

/** Accepts -1..1, 0..10 or 0..100 scales and maps them to -1..1. */
export function normalizeScore(v: unknown, sentiment?: string): number | undefined {
  const n = typeof v === 'number' ? v : parseFloat(str(v))
  if (!Number.isFinite(n)) {
    const s = str(sentiment).toLowerCase()
    if (s.startsWith('pos')) return 0.6
    if (s.startsWith('neg')) return -0.6
    if (s) return 0
    return undefined
  }
  let x = n
  if (n > 10) x = n / 50 - 1
  else if (n > 1) x = n / 5 - 1
  return Math.max(-1, Math.min(1, +x.toFixed(2)))
}

export function normalizeSeverity(v: unknown): Severity {
  const s = str(v).toLowerCase()
  if (s.startsWith('crit') || s === 'urgent') return 'critical'
  if (s.startsWith('high') || s === 'major') return 'high'
  if (s.startsWith('med') || s === 'moderate') return 'medium'
  return 'low'
}

export function normalizeStatus(v: unknown): FeedbackStatus {
  const s = str(v).toLowerCase().replace(/[\s-]+/g, '_')
  if (s === 'in_review' || s === 'reviewing' || s === 'investigating' || s === 'open') return 'in_review'
  if (s === 'actioned' || s === 'in_progress' || s === 'monitoring') return 'actioned'
  if (s === 'resolved' || s === 'closed' || s === 'done') return 'resolved'
  return 'new'
}

/** Parses a date from the database or sheet; returns null when it is not a real date. */
function toIso(v: unknown): string | null {
  if (v == null || v === '') return null
  const d = v instanceof Date ? v : new Date(typeof v === 'number' ? v : String(v))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function normalizeRecord(row: Record<string, unknown>): FeedbackRecord {
  const scoreRaw = normalizeScore(row.sentiment_score, str(row.sentiment))
  const sentiment = normalizeSentiment(row.sentiment, scoreRaw)
  const created = toIso(row.created_at) ?? toIso(row.received_at) ?? new Date().toISOString()
  const received = toIso(row.received_at) ?? created
  const issue = nullable(row.issue)
  return {
    id: str(row.id),
    original_message: str(row.original_message ?? row.message ?? row.body),
    subject: nullable(row.subject),
    source: titleCaseSource(str(row.source) || 'Gmail'),
    received_at: received,
    customer_name: nullable(row.customer_name),
    customer_email: nullable(row.customer_email),
    sentiment,
    sentiment_score: scoreRaw ?? (sentiment === 'positive' ? 0.6 : sentiment === 'negative' ? -0.6 : 0),
    category: titleCase(str(row.category) || 'Uncategorized'),
    theme: titleCaseKeepAmp(str(row.theme) || 'General'),
    issue: issue && !/^(none|n\/a|null|no issue)$/i.test(issue) ? issue : null,
    severity: normalizeSeverity(row.severity),
    ai_summary: str(row.ai_summary ?? row.summary),
    status: normalizeStatus(row.status),
    created_at: created,
  }
}

function titleCaseSource(s: string) {
  return /^gmail$/i.test(s) ? 'Gmail' : s.charAt(0).toUpperCase() + s.slice(1)
}

function titleCaseKeepAmp(s: string) {
  // keep the AI's casing if it already looks intentional
  return /[A-Z]/.test(s) ? s.trim() : titleCase(s)
}
