export type Sentiment = 'positive' | 'neutral' | 'negative'
export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type FeedbackStatus = 'new' | 'in_review' | 'actioned' | 'resolved'
export type IssueStatus = 'new' | 'investigating' | 'monitoring' | 'resolved'

/** One analyzed feedback record, as written to the database by the n8n workflow. */
export interface FeedbackRecord {
  id: string
  original_message: string
  subject: string | null
  source: string
  received_at: string
  customer_name: string | null
  customer_email: string | null
  sentiment: Sentiment
  /** -1 (very negative) … 1 (very positive) */
  sentiment_score: number
  category: string
  theme: string
  issue: string | null
  severity: Severity
  ai_summary: string
  status: FeedbackStatus
  created_at: string
}

export interface ExecutiveSummary {
  summary: string
  generated_at: string
  /** 'ai' when written by the n8n workflow, 'computed' when Sentra derived it from the records. */
  origin: 'ai' | 'computed'
  highlights: string[]
}

export const SENTIMENTS: Sentiment[] = ['positive', 'neutral', 'negative']
export const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical']
export const FEEDBACK_STATUSES: FeedbackStatus[] = ['new', 'in_review', 'actioned', 'resolved']
export const ISSUE_STATUSES: IssueStatus[] = ['new', 'investigating', 'monitoring', 'resolved']

export const SEVERITY_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 }
