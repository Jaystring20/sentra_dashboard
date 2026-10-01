import clsx from 'clsx'
import {
  Activity,
  BarChart3,
  Bell,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Moon,
  RefreshCw,
  Send,
  Settings,
  Smile,
  Sparkles,
  Sun,
  Tags,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import type { RangePreset } from '../lib/analytics'
import { makeIncomingDemo } from '../lib/data/demo'
import { dataSource, simulateIncoming } from '../lib/data/source'
import { useData } from '../lib/store'
import { Drawers } from './Drawers'
import { Button, ErrorState, PageSkeleton, Segmented } from './ui'

const NAV: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Overview', icon: <LayoutDashboard size={17} /> },
  { to: '/feedback', label: 'Feedback', icon: <MessageSquareText size={17} /> },
  { to: '/insights', label: 'AI Insights', icon: <Sparkles size={17} /> },
  { to: '/sentiment', label: 'Sentiment', icon: <Smile size={17} /> },
  { to: '/themes', label: 'Themes', icon: <Tags size={17} /> },
  { to: '/issues', label: 'Issues & Alerts', icon: <Bell size={17} /> },
  { to: '/analytics', label: 'Analytics', icon: <BarChart3 size={17} /> },
  { to: '/settings', label: 'Settings', icon: <Settings size={17} /> },
]

export const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'all', label: 'All' },
]

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <img src="/favicon.svg" alt="" className="size-8" />
      <div className="leading-tight">
        <p className="text-[15px] font-semibold tracking-tight text-ink">Sentra</p>
        <p className="text-[11px] text-ink-3">Feedback Intelligence</p>
      </div>
    </div>
  )
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="mt-6 space-y-0.5" aria-label="Main">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-accent-soft text-accent-text' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
            )
          }
        >
          {n.icon}
          {n.label}
        </NavLink>
      ))}
    </nav>
  )
}

function SourceStatus() {
  const { lastSynced, error } = useData()
  const live = dataSource.mode === 'supabase'
  return (
    <div className="rounded-lg border border-border p-3 text-xs">
      <div className="flex items-center gap-2 font-medium text-ink">
        <span className={clsx('size-2 rounded-full', error ? 'bg-critical' : live ? 'bg-good' : 'bg-warning')} />
        {error ? 'Connection error' : live ? 'Live · Supabase' : 'Demo data'}
      </div>
      <p className="mt-1 text-ink-3">{lastSynced ? `Synced ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : error ? 'Not connected' : 'Connecting…'}</p>
    </div>
  )
}

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const t = document.documentElement.dataset.theme
    if (t === 'light' || t === 'dark') return t
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('sentra-theme', next)
    } catch {
      /* ignore */
    }
    setTheme(next)
  }
  return { theme, toggle }
}

export function Layout() {
  const { loading, error, reload, preset, setPreset, records } = useData()
  const [open, setOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-bg">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface px-3 py-5 lg:flex">
        <Brand />
        <Nav />
        <div className="mt-auto">
          <SourceStatus />
        </div>
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-surface px-3 py-5 shadow-xl">
            <div className="flex items-center justify-between">
              <Brand />
              <Button variant="ghost" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X size={18} />
              </Button>
            </div>
            <Nav onNavigate={() => setOpen(false)} />
            <div className="mt-auto">
              <SourceStatus />
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 sm:px-6">
            <Button variant="ghost" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
              <Menu size={18} />
            </Button>
            <span className="text-sm font-semibold max-[400px]:hidden lg:hidden">Sentra</span>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <Segmented label="Date range" value={preset} onChange={setPreset} options={RANGE_OPTIONS} />
              {dataSource.mode === 'demo' && (
                <Button
                  variant="secondary"
                  className="max-sm:!hidden"
                  title="Simulate a new email being processed by the n8n workflow"
                  onClick={() => simulateIncoming(makeIncomingDemo())}
                  disabled={loading || !!error}
                >
                  <Send size={14} /> Simulate email
                </Button>
              )}
              <Button variant="ghost" aria-label="Refresh data" title="Refresh data" onClick={reload}>
                <RefreshCw size={16} className={clsx(loading && 'animate-spin')} />
              </Button>
              <Button variant="ghost" aria-label="Toggle theme" title="Toggle theme" onClick={toggle}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
          {loading && !records.length ? (
            <PageSkeleton />
          ) : error && !records.length ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <>
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink-2">
                  <Activity size={14} className="text-critical-text" /> Showing the last loaded data — refresh failed: {error}
                </div>
              )}
              <Outlet />
            </>
          )}
        </main>
      </div>
      <Drawers />
    </div>
  )
}
