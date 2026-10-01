import clsx from 'clsx'
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  Inbox,
  Minus,
  RefreshCw,
  SearchX,
  ShieldAlert,
} from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { FeedbackStatus, IssueStatus, Sentiment, Severity } from '../lib/types'

/* ------------------------------------------------------------------ layout */

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('min-w-0 rounded-xl border border-border bg-surface', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ states */

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} aria-hidden />
}

export function CardSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <Card className="p-5">
      <Skeleton className="mb-2 h-4 w-40" />
      <Skeleton className="mb-5 h-3 w-24" />
      <Skeleton className={clsx('w-full', height)} />
    </Card>
  )
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-2 h-7 w-56" />
      <Skeleton className="mb-8 h-4 w-96 max-w-full" />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="mb-3 h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CardSkeleton />
        </div>
        <CardSkeleton />
      </div>
    </div>
  )
}

export function EmptyState({
  title = 'No feedback yet',
  message = 'Once customer feedback is received and processed, your insights will appear here.',
  icon,
  action,
}: {
  title?: string
  message?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 rounded-full bg-surface-2 p-3 text-ink-3">{icon ?? <Inbox size={22} />}</div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-2">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function NoResults({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={<SearchX size={22} />}
      title="No matching feedback"
      message="No records match the current search and filters. Try widening the date range or clearing some filters."
      action={onClear && <Button onClick={onClear}>Clear filters</Button>}
    />
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="mx-auto mt-10 max-w-lg">
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <div className="mb-3 rounded-full bg-surface-2 p-3 text-critical-text">
          <CircleAlert size={22} />
        </div>
        <p className="text-sm font-semibold text-ink">We couldn't load your feedback data</p>
        <p className="mt-1 text-sm text-ink-2">Sentra could not reach the feedback database. Check the connection settings and try again.</p>
        <code className="mt-3 max-w-full overflow-x-auto rounded bg-surface-2 px-2 py-1 text-xs text-ink-2">{message}</code>
        {onRetry && (
          <Button className="mt-5" onClick={onRetry}>
            <RefreshCw size={14} /> Retry
          </Button>
        )}
      </div>
    </Card>
  )
}

/* ---------------------------------------------------------------- controls */

export function Button({ className, variant = 'secondary', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50',
        variant === 'primary' && 'bg-accent text-white hover:opacity-90',
        variant === 'secondary' && 'border border-border bg-surface text-ink hover:bg-surface-2',
        variant === 'ghost' && 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        className,
      )}
      {...rest}
    />
  )
}

export function Select({ className, label, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium tracking-wide text-ink-3 uppercase">{label}</span>
      <select
        className={clsx(
          'h-9 min-w-0 rounded-lg border border-border bg-surface px-2.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </label>
  )
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === o.value ? 'bg-surface-2 text-ink shadow-sm' : 'text-ink-3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ badges */

const SENTIMENT_DOT: Record<Sentiment, string> = { positive: 'bg-pos', neutral: 'bg-neu', negative: 'bg-neg' }

export function SentimentBadge({ sentiment, score }: { sentiment: Sentiment; score?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs font-medium whitespace-nowrap text-ink-2 capitalize">
      <span className={clsx('size-2 rounded-full', SENTIMENT_DOT[sentiment])} />
      {sentiment}
      {score != null && <span className="tabular text-ink-3">{score > 0 ? '+' : ''}{score.toFixed(2)}</span>}
    </span>
  )
}

export function SentimentDot({ sentiment }: { sentiment: Sentiment }) {
  return <span className={clsx('inline-block size-2 shrink-0 rounded-full', SENTIMENT_DOT[sentiment])} aria-label={sentiment} />
}

const SEVERITY_STYLE: Record<Severity, { icon: ReactNode; text: string; dot: string }> = {
  low: { icon: <CircleCheck size={12} />, text: 'text-good-text', dot: 'bg-good' },
  medium: { icon: <AlertTriangle size={12} />, text: 'text-warning-text', dot: 'bg-warning' },
  high: { icon: <ShieldAlert size={12} />, text: 'text-serious-text', dot: 'bg-serious' },
  critical: { icon: <AlertOctagon size={12} />, text: 'text-critical-text', dot: 'bg-critical' },
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLE[severity]
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-medium whitespace-nowrap capitalize', s.text)}>
      {s.icon}
      {severity}
    </span>
  )
}

const STATUS_LABEL: Record<FeedbackStatus | IssueStatus, string> = {
  new: 'New',
  in_review: 'In review',
  actioned: 'Actioned',
  resolved: 'Resolved',
  investigating: 'Investigating',
  monitoring: 'Monitoring',
}

export function statusLabel(s: FeedbackStatus | IssueStatus) {
  return STATUS_LABEL[s]
}

export function StatusBadge({ status }: { status: FeedbackStatus | IssueStatus }) {
  const tone =
    status === 'resolved'
      ? 'bg-surface-2 text-ink-3'
      : status === 'new'
        ? 'bg-accent-soft text-accent-text'
        : 'bg-surface-2 text-ink-2'
  return <span className={clsx('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap', tone)}>{STATUS_LABEL[status]}</span>
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-xs text-ink-2">{children}</span>
}

/* ------------------------------------------------------------------- delta */

/**
 * Change indicator. `goodWhenUp` controls whether an increase is framed as
 * good (positive feedback) or bad (negative feedback). Always arrow + text.
 */
export function Delta({ value, format = 'pct', goodWhenUp = true, neutral = false }: { value: number | null; format?: 'pct' | 'abs'; goodWhenUp?: boolean; neutral?: boolean }) {
  if (value == null) return <span className="text-xs text-ink-3">No prior data</span>
  const flat = Math.abs(value) < (format === 'pct' ? 0.005 : 0.005)
  const up = value > 0
  const good = neutral || flat ? null : up === goodWhenUp
  const text = format === 'pct' ? `${Math.abs(Math.round(value * 100))}%` : Math.abs(value).toFixed(2)
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular',
        good === true && 'text-good-text',
        good === false && 'text-critical-text',
        good === null && 'text-ink-2',
      )}
    >
      {flat ? <Minus size={12} /> : up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {text}
    </span>
  )
}

export function TrendText({ trend }: { trend: number | null }) {
  if (trend == null) return <span className="text-xs font-medium whitespace-nowrap text-accent-text">Up from 0</span>
  return <Delta value={trend} neutral />
}
