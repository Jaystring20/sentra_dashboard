const env = import.meta.env
const read = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export const config = {
  /** Google Sheets: URL of the Apps Script web app (google-sheets/Code.gs). */
  sheetsApiUrl: read(env.VITE_SHEETS_API_URL),
  /** Must match the SENTRA_TOKEN script property; required for status updates. */
  sheetsToken: read(env.VITE_SHEETS_TOKEN),
  /** How often to check the sheet for new rows, in seconds. */
  sheetsPollSeconds: Math.max(10, Number(read(env.VITE_SHEETS_POLL_SECONDS)) || 30),

  supabaseUrl: read(env.VITE_SUPABASE_URL),
  supabaseAnonKey: read(env.VITE_SUPABASE_ANON_KEY),
  feedbackTable: read(env.VITE_FEEDBACK_TABLE) || 'feedback',
  summaryTable: read(env.VITE_SUMMARY_TABLE) || 'executive_summaries',
}

export const isSheetsConfigured = Boolean(config.sheetsApiUrl)
export const isSupabaseConfigured = !isSheetsConfigured && Boolean(config.supabaseUrl && config.supabaseAnonKey)
