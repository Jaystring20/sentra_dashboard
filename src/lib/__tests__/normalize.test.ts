import { describe, expect, it } from 'vitest'
import { normalizeRecord, normalizeScore, normalizeSentiment, normalizeSeverity, normalizeStatus } from '../data/normalize'

describe('normalize', () => {
  it('maps label variants', () => {
    expect(normalizeSentiment('Positive')).toBe('positive')
    expect(normalizeSentiment('NEGATIVE')).toBe('negative')
    expect(normalizeSentiment('', 0.5)).toBe('positive')
    expect(normalizeSeverity('Urgent')).toBe('critical')
    expect(normalizeSeverity('Moderate')).toBe('medium')
    expect(normalizeStatus('In Review')).toBe('in_review')
    expect(normalizeStatus('closed')).toBe('resolved')
  })

  it('maps score scales to -1..1', () => {
    expect(normalizeScore(-0.4)).toBe(-0.4)
    expect(normalizeScore(10)).toBe(1)
    expect(normalizeScore(0)).toBe(0)
    expect(normalizeScore(75)).toBe(0.5)
    expect(normalizeScore(null, 'negative')).toBe(-0.6)
  })

  it('normalises a loosely shaped n8n row', () => {
    const r = normalizeRecord({ id: 7, message: 'Hi', sentiment: 'Negative', sentiment_score: '2', theme: 'delivery', issue: 'None', severity: 'HIGH', created_at: '2026-09-01T10:00:00Z' })
    expect(r.id).toBe('7')
    expect(r.original_message).toBe('Hi')
    expect(r.sentiment_score).toBe(-0.6)
    expect(r.theme).toBe('Delivery')
    expect(r.issue).toBeNull()
    expect(r.severity).toBe('high')
    expect(r.received_at).toBe('2026-09-01T10:00:00.000Z')
    expect(r.status).toBe('new')
  })
})
