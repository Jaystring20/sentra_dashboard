import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../data/config', () => ({
  config: { sheetsApiUrl: 'https://script.google.com/macros/s/abc/exec', sheetsToken: 'tok', sheetsPollSeconds: 30 },
}))

const { loadSheetFeedback, loadSheetSummary, updateSheetStatus } = await import('../data/sheets')

function mockFetch(body: string, status = 200) {
  const fn = vi.fn(async (_url: URL | string, _init?: RequestInit) => new Response(body, { status }))
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

describe('Google Sheets source', () => {
  it('loads, normalises and sorts rows newest first, skipping empty ones', async () => {
    const fetch = mockFetch(
      JSON.stringify({
        ok: true,
        rows: [
          { id: 'A', original_message: 'old', received_at: '2026-09-01T10:00:00Z', sentiment: 'Positive', severity: 'Low' },
          { id: 'B', original_message: 'new', received_at: '2026-09-20T10:00:00Z', sentiment: 'negative', sentiment_score: 2, severity: 'HIGH' },
          { id: 'ROW-9', original_message: null, ai_summary: null },
          { id: 'C', original_message: 'bad date', received_at: 'not a date', created_at: '2026-09-10T10:00:00Z' },
        ],
      }),
    )
    const rows = await loadSheetFeedback()
    expect(fetch.mock.calls[0][0].toString()).toContain('action=feedback')
    expect(rows.map((r) => r.id)).toEqual(['B', 'C', 'A'])
    expect(rows[0]).toMatchObject({ sentiment: 'negative', severity: 'high', sentiment_score: -0.6 })
    expect(rows[1].received_at).toBe('2026-09-10T10:00:00.000Z')
  })

  it('explains a private (sign-in) deployment', async () => {
    mockFetch('<!doctype html><html>accounts.google.com sign in</html>')
    await expect(loadSheetFeedback()).rejects.toThrow(/Anyone/)
  })

  it('surfaces script errors', async () => {
    mockFetch(JSON.stringify({ ok: false, error: 'Missing tab "feedback". Run setupSheet() first.' }))
    await expect(loadSheetFeedback()).rejects.toThrow(/setupSheet/)
  })

  it('treats a missing summary as optional', async () => {
    mockFetch(JSON.stringify({ ok: true, summary: null }))
    expect(await loadSheetSummary()).toBeNull()
  })

  it('posts status updates as text/plain with the token', async () => {
    const fetch = mockFetch(JSON.stringify({ ok: true }))
    await updateSheetStatus('B', 'resolved')
    const init = fetch.mock.calls[0][1]!
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toMatch(/^text\/plain/)
    expect(JSON.parse(String(init.body))).toEqual({ action: 'updateStatus', id: 'B', status: 'resolved', token: 'tok' })
  })
})
