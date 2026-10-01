import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Card, EmptyState } from './components/ui'
import { Analytics } from './pages/Analytics'
import { Feedback } from './pages/Feedback'
import { Insights } from './pages/Insights'
import { Issues } from './pages/Issues'
import { Overview } from './pages/Overview'
import { Sentiment } from './pages/Sentiment'
import { Settings } from './pages/Settings'
import { ThemeDetail, Themes } from './pages/Themes'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="insights" element={<Insights />} />
        <Route path="sentiment" element={<Sentiment />} />
        <Route path="themes" element={<Themes />} />
        <Route path="themes/:name" element={<ThemeDetail />} />
        <Route path="issues" element={<Issues />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route
          path="*"
          element={
            <Card>
              <EmptyState title="Page not found" message="This page does not exist." action={<Link className="text-sm font-medium text-accent-text" to="/">Back to Overview</Link>} />
            </Card>
          }
        />
      </Route>
    </Routes>
  )
}
