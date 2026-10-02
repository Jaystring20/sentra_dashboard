import type { ExecutiveSummary, FeedbackRecord, FeedbackStatus } from '../types'
import { config } from './config'
import { normalizeRecord } from './normalize'

/**
 * Reads and writes the Google Sheet through the Apps Script web app in
 * google-sheets/Code.gs. Apps Script cannot answer CORS preflight requests, so
 * writes are sent as text/plain (a "simple" request) and the script parses JSON.
 */

interface ApiResponse {
  ok: boolean
  error?: string
  rows?: Record<string, unknown>[]
  summary?: { summary: string; generated_at: string; highlights: string[] } | null
}

async function call(init?: RequestInit, action = 'feedback'): Promise<ApiResponse> {
  const url = new URL(config.sheetsApiUrl)
  if (!init) url.searchParams.set('action', action)
  let res: Response
  try {
    res = await fetch(url, { redirect: 'follow', ...init })
  } catch {
    throw new Error('Could not reach the Google Sheets web app. Check VITE_SHEETS_API_URL and that the deployment is shared with "Anyone".')
  }
  const text = await res.text()
  let body: ApiResponse
  try {
    body = JSON.parse(text) as ApiResponse
  } catch {
    // A sign-in page instead of JSON means the web app is not public.
    throw new Error(
      /accounts\.google\.com|<html/i.test(text)
        ? 'The Google Sheets web app returned a sign-in page. Redeploy it with "Who has access: Anyone".'
        : `Unexpected response from the Google Sheets web app (HTTP ${res.status}).`,
    )
  }
  if (!body.ok) throw new Error(body.error || 'The Google Sheets web app reported an error.')
  return body
}

export async function loadSheetFeedback(): Promise<FeedbackRecord[]> {
  const body = await call()
  return (body.rows ?? [])
    .filter((r) => r.original_message || r.message || r.ai_summary)
    .map(normalizeRecord)
    .sort((a, b) => b.received_at.localeCompare(a.received_at))
}

export async function loadSheetSummary(): Promise<ExecutiveSummary | null> {
  try {
    const { summary } = await call(undefined, 'summary')
    if (!summary?.summary) return null
    return { summary: summary.summary, generated_at: summary.generated_at || new Date().toISOString(), highlights: summary.highlights ?? [], origin: 'ai' }
  } catch {
    // The summary tab is optional; Sentra computes one when it is missing.
    return null
  }
}

export async function updateSheetStatus(id: string, status: FeedbackStatus) {
  if (!config.sheetsToken) throw new Error('Status changes need VITE_SHEETS_TOKEN (the SENTRA_TOKEN set in Apps Script).')
  await call({
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'updateStatus', id, status, token: config.sheetsToken }),
  })
}
