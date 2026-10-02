import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ExecutiveSummary, FeedbackRecord, FeedbackStatus } from '../types'
import { config, isSheetsConfigured, isSupabaseConfigured } from './config'
import { generateDemoFeedback } from './demo'
import { normalizeRecord } from './normalize'
import { loadSheetFeedback, loadSheetSummary, updateSheetStatus } from './sheets'

export type SourceMode = 'sheets' | 'supabase' | 'demo'

export interface DataSource {
  mode: SourceMode
  label: string
  loadFeedback(): Promise<FeedbackRecord[]>
  loadSummary(): Promise<ExecutiveSummary | null>
  updateStatus(id: string, status: FeedbackStatus): Promise<void>
  /** Calls back whenever new or changed rows arrive. Returns an unsubscribe fn. */
  subscribe(onChange: () => void): () => void
}

const PAGE = 1000
const MAX_ROWS = 20000

class SupabaseSource implements DataSource {
  mode = 'supabase' as const
  label = 'Supabase'
  private client: SupabaseClient

  constructor() {
    this.client = createClient(config.supabaseUrl, config.supabaseAnonKey)
  }

  async loadFeedback() {
    const rows: Record<string, unknown>[] = []
    for (let from = 0; from < MAX_ROWS; from += PAGE) {
      const { data, error } = await this.client
        .from(config.feedbackTable)
        .select('*')
        .order('received_at', { ascending: false })
        .range(from, from + PAGE - 1)
      if (error) throw new Error(`Could not read "${config.feedbackTable}": ${error.message}`)
      rows.push(...(data ?? []))
      if (!data || data.length < PAGE) break
    }
    return rows.map(normalizeRecord)
  }

  async loadSummary(): Promise<ExecutiveSummary | null> {
    const { data, error } = await this.client
      .from(config.summaryTable)
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(1)
    // The summary table is optional: Sentra falls back to a computed summary.
    if (error || !data?.length) return null
    const row = data[0] as Record<string, unknown>
    const highlights = Array.isArray(row.highlights) ? (row.highlights as unknown[]).map(String) : []
    return {
      summary: String(row.summary ?? ''),
      generated_at: String(row.generated_at ?? row.created_at ?? new Date().toISOString()),
      origin: 'ai',
      highlights,
    }
  }

  async updateStatus(id: string, status: FeedbackStatus) {
    const { error } = await this.client.from(config.feedbackTable).update({ status }).eq('id', id)
    if (error) throw new Error(error.message)
  }

  subscribe(onChange: () => void) {
    const channel = this.client
      .channel('sentra-feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: config.feedbackTable }, onChange)
      .subscribe()
    // Polling fallback in case Realtime is not enabled on the table.
    const timer = window.setInterval(onChange, 60_000)
    return () => {
      window.clearInterval(timer)
      void this.client.removeChannel(channel)
    }
  }
}

class SheetsSource implements DataSource {
  mode = 'sheets' as const
  label = 'Google Sheets'
  loadFeedback = loadSheetFeedback
  loadSummary = loadSheetSummary
  updateStatus = updateSheetStatus

  subscribe(onChange: () => void) {
    // Apps Script has no push channel, so poll; skip while the tab is hidden.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') onChange()
    }, config.sheetsPollSeconds * 1000)
    const onVisible = () => document.visibilityState === 'visible' && onChange()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }
}

class DemoSource implements DataSource {
  mode = 'demo' as const
  label = 'Demo data'
  private records = generateDemoFeedback()
  private listeners = new Set<() => void>()

  async loadFeedback() {
    await new Promise((r) => setTimeout(r, 450))
    return this.records.map((r) => ({ ...r }))
  }

  async loadSummary() {
    return null
  }

  async updateStatus(id: string, status: FeedbackStatus) {
    this.records = this.records.map((r) => (r.id === id ? { ...r, status } : r))
  }

  subscribe(onChange: () => void) {
    this.listeners.add(onChange)
    return () => this.listeners.delete(onChange)
  }

  /** Simulates the n8n workflow writing a freshly analyzed email (demo mode only). */
  simulateIncoming(record: FeedbackRecord) {
    this.records = [record, ...this.records]
    this.listeners.forEach((l) => l())
  }
}

export const dataSource: DataSource = isSheetsConfigured ? new SheetsSource() : isSupabaseConfigured ? new SupabaseSource() : new DemoSource()

export function simulateIncoming(record: FeedbackRecord) {
  if (dataSource instanceof DemoSource) dataSource.simulateIncoming(record)
}
