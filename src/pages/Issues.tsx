import clsx from 'clsx'
import { AlertOctagon, AlertTriangle, BellRing, Info, ShieldAlert } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { SentimentBar } from '../components/charts'
import { Button, Card, CardHeader, EmptyState, PageHeader, Segmented, SeverityBadge, statusLabel, TrendText } from '../components/ui'
import { rangeLabel } from '../components/widgets'
import { ALERT_RULES, comparisonWindows, detectAlerts, fmtDate, inRange, issueStats, type AlertLevel } from '../lib/analytics'
import { useData, usePanels } from '../lib/store'
import { ISSUE_STATUSES, type IssueStatus } from '../lib/types'

const LEVEL_META: Record<AlertLevel, { icon: ReactNode; text: string; bar: string; label: string }> = {
  critical: { icon: <AlertOctagon size={16} />, text: 'text-critical-text', bar: 'bg-critical', label: 'Critical' },
  serious: { icon: <ShieldAlert size={16} />, text: 'text-serious-text', bar: 'bg-serious', label: 'Serious' },
  warning: { icon: <AlertTriangle size={16} />, text: 'text-warning-text', bar: 'bg-warning', label: 'Warning' },
}

export function Issues() {
  const { records, range, preset, issueStatus, setIssueStatus } = useData()
  const { openEvidence } = usePanels()
  const [filter, setFilter] = useState<'all' | IssueStatus>('all')
  const [showRules, setShowRules] = useState(false)

  const { issues, alerts } = useMemo(() => {
    const current = inRange(records, range.from, range.to)
    return { issues: issueStats(current, records, comparisonWindows(records, range)), alerts: detectAlerts(records, range) }
  }, [records, range])

  const withStatus = issues.map((i) => ({ ...i, status: issueStatus(i.name, i.derivedStatus) }))
  const visible = filter === 'all' ? withStatus : withStatus.filter((i) => i.status === filter)
  const counts = Object.fromEntries(ISSUE_STATUSES.map((s) => [s, withStatus.filter((i) => i.status === s).length])) as Record<IssueStatus, number>

  return (
    <>
      <PageHeader title="Issues & Alerts" description={`${rangeLabel(preset)} · Recurring customer problems and rule-based alerts generated from the analyzed data.`} />

      <Card className="mb-6">
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <BellRing size={15} /> Active alerts <span className="font-normal text-ink-3">({alerts.length})</span>
            </span>
          }
          subtitle="Evaluated automatically every time new feedback arrives"
          action={
            <Button variant="ghost" className="text-xs" onClick={() => setShowRules((s) => !s)}>
              <Info size={13} /> {showRules ? 'Hide rules' : 'Alert rules'}
            </Button>
          }
        />
        {showRules && (
          <ul className="mx-5 mb-4 space-y-1 rounded-lg bg-surface-2 px-4 py-3 text-xs text-ink-2">
            {Object.entries(ALERT_RULES).map(([k, v]) => (
              <li key={k}>
                <span className="font-medium text-ink">{k.replace(/_/g, ' ')}</span> — {v}
              </li>
            ))}
          </ul>
        )}
        {alerts.length ? (
          <ul className="divide-y divide-border border-t border-border">
            {alerts.map((a) => {
              const m = LEVEL_META[a.level]
              return (
                <li key={a.id} className="flex items-stretch">
                  <span className={clsx('w-1 shrink-0', m.bar)} />
                  <div className="flex flex-1 flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <span className={clsx('mt-0.5', m.text)}>{m.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">
                          <span className={clsx('mr-2 text-xs font-semibold uppercase', m.text)}>{m.label}</span>
                          {a.title}
                        </p>
                        <p className="text-xs text-ink-2">{a.detail}</p>
                      </div>
                    </div>
                    <Button className="shrink-0 self-start text-xs sm:self-center" onClick={() => openEvidence({ title: a.title, description: a.detail, ids: a.evidenceIds })}>
                      View feedback ({a.evidenceIds.length})
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="border-t border-border px-5 py-8 text-center text-sm text-ink-3">No alerts triggered in this period.</p>
        )}
      </Card>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-ink">
          Issues <span className="font-normal text-ink-3">({issues.length})</span>
        </h2>
        <Segmented
          label="Filter by status"
          value={filter}
          onChange={setFilter}
          options={[{ value: 'all', label: `All ${issues.length}` }, ...ISSUE_STATUSES.map((s) => ({ value: s, label: `${statusLabel(s)} ${counts[s]}` }))]}
        />
      </div>

      <Card>
        {!issues.length ? (
          <EmptyState title="No issues detected" message={records.length ? 'No customer problems were identified in the selected date range.' : 'Once customer feedback is received and processed, your insights will appear here.'} />
        ) : !visible.length ? (
          <EmptyState title={`No ${statusLabel(filter as IssueStatus).toLowerCase()} issues`} message="Choose another status filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border text-[11px] tracking-wide text-ink-3 uppercase">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Issue</th>
                  <th className="px-3 py-2.5 text-right font-medium">Frequency</th>
                  <th className="px-3 py-2.5 font-medium">Severity</th>
                  <th className="px-3 py-2.5 font-medium">Sentiment</th>
                  <th className="px-3 py-2.5 font-medium">First detected</th>
                  <th className="px-3 py-2.5 font-medium">Last detected</th>
                  <th className="px-3 py-2.5 font-medium">Trend</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((i) => (
                  <tr key={i.name} className="align-middle">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{i.name}</p>
                      <p className="text-xs text-ink-3">{i.theme}</p>
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-ink tabular">{i.count}</td>
                    <td className="px-3 py-3">
                      <SeverityBadge severity={i.severity} />
                    </td>
                    <td className="w-32 px-3 py-3">
                      <SentimentBar positive={i.positive} neutral={i.neutral} negative={i.negative} />
                      <span className="mt-1 block text-[11px] text-ink-3 tabular">avg {i.avgScore.toFixed(2)}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-ink-2">{fmtDate(i.firstDetected)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-ink-2">{fmtDate(i.lastDetected)}</td>
                    <td className="px-3 py-3">
                      <TrendText trend={i.trend} />
                    </td>
                    <td className="px-3 py-3">
                      <select
                        aria-label={`Status for ${i.name}`}
                        value={i.status}
                        onChange={(e) => setIssueStatus(i.name, e.target.value as IssueStatus)}
                        className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-ink"
                      >
                        {ISSUE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {statusLabel(s)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" className="text-xs whitespace-nowrap" onClick={() => openEvidence({ title: i.name, description: `${i.count} reports · ${i.theme}`, ids: i.recordIds })}>
                        View feedback
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-ink-3">Issue statuses start from an automatic suggestion (new, rising or critical → investigating, all records resolved → resolved) and can be changed by your team. Changes are saved in this browser.</p>
    </>
  )
}
