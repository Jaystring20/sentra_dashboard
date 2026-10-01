import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { computeExecutiveSummary, rangeFor, type DateRange, type RangePreset } from './analytics'
import { dataSource } from './data/source'
import type { ExecutiveSummary, FeedbackRecord, FeedbackStatus, IssueStatus } from './types'

interface DataState {
  records: FeedbackRecord[]
  loading: boolean
  error: string | null
  lastSynced: Date | null
  /** ids that arrived since the dashboard was opened (for highlighting) */
  freshIds: Set<string>
  reload: () => void
  preset: RangePreset
  setPreset: (p: RangePreset) => void
  range: DateRange
  summary: ExecutiveSummary | null
  updateStatus: (id: string, status: FeedbackStatus) => Promise<void>
  issueStatus: (name: string, derived: IssueStatus) => IssueStatus
  setIssueStatus: (name: string, status: IssueStatus) => void
  byId: Map<string, FeedbackRecord>
}

const DataContext = createContext<DataState | null>(null)

const ISSUE_KEY = 'sentra-issue-status'
const RANGE_KEY = 'sentra-range'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — keep in memory only */
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<FeedbackRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [aiSummary, setAiSummary] = useState<ExecutiveSummary | null>(null)
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set())
  const [preset, setPresetState] = useState<RangePreset>(() => readJson<RangePreset>(RANGE_KEY, '30d'))
  const [issueOverrides, setIssueOverrides] = useState<Record<string, IssueStatus>>(() => readJson(ISSUE_KEY, {}))
  const known = useRef<Set<string> | null>(null)

  const load = useCallback(async (initial: boolean) => {
    if (initial) setLoading(true)
    try {
      const [rows, summary] = await Promise.all([dataSource.loadFeedback(), dataSource.loadSummary()])
      if (known.current) {
        const seen = known.current
        const added = rows.filter((r) => !seen.has(r.id)).map((r) => r.id)
        if (added.length) setFreshIds((prev) => new Set([...prev, ...added]))
      }
      known.current = new Set(rows.map((r) => r.id))
      setRecords(rows)
      setAiSummary(summary)
      setError(null)
      setLastSynced(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error while loading feedback.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
    return dataSource.subscribe(() => void load(false))
  }, [load])

  const setPreset = useCallback((p: RangePreset) => {
    setPresetState(p)
    writeJson(RANGE_KEY, p)
  }, [])

  // Recomputed whenever data changes so "now" stays current after live updates.
  const range = useMemo(() => rangeFor(preset, records), [preset, records])

  const summary = useMemo(() => aiSummary ?? computeExecutiveSummary(records, range), [aiSummary, records, range])

  const updateStatus = useCallback(async (id: string, status: FeedbackStatus) => {
    setRecords((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
    try {
      await dataSource.updateStatus(id, status)
    } catch (e) {
      void load(false)
      throw e
    }
  }, [load])

  const issueStatus = useCallback((name: string, derived: IssueStatus) => issueOverrides[name] ?? derived, [issueOverrides])
  const setIssueStatus = useCallback((name: string, status: IssueStatus) => {
    setIssueOverrides((prev) => {
      const next = { ...prev, [name]: status }
      writeJson(ISSUE_KEY, next)
      return next
    })
  }, [])

  const byId = useMemo(() => new Map(records.map((r) => [r.id, r])), [records])

  const value: DataState = {
    records,
    loading,
    error,
    lastSynced,
    freshIds,
    reload: () => void load(true),
    preset,
    setPreset,
    range,
    summary,
    updateStatus,
    issueStatus,
    setIssueStatus,
    byId,
  }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}

/* ---------------------------------------------------------- drill-down panels */

export interface EvidenceRequest {
  title: string
  description?: string
  ids: string[]
}

interface PanelState {
  openFeedback: (id: string) => void
  openEvidence: (req: EvidenceRequest) => void
  feedbackId: string | null
  evidence: EvidenceRequest | null
  closeFeedback: () => void
  closeEvidence: () => void
}

const PanelContext = createContext<PanelState | null>(null)

export function PanelProvider({ children }: { children: ReactNode }) {
  const [feedbackId, setFeedbackId] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<EvidenceRequest | null>(null)
  const value = useMemo<PanelState>(
    () => ({
      feedbackId,
      evidence,
      openFeedback: setFeedbackId,
      openEvidence: setEvidence,
      closeFeedback: () => setFeedbackId(null),
      closeEvidence: () => setEvidence(null),
    }),
    [feedbackId, evidence],
  )
  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>
}

export function usePanels() {
  const ctx = useContext(PanelContext)
  if (!ctx) throw new Error('usePanels must be used inside PanelProvider')
  return ctx
}
