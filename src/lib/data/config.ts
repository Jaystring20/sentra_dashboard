const env = import.meta.env

export const config = {
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined)?.trim() || '',
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '',
  feedbackTable: (env.VITE_FEEDBACK_TABLE as string | undefined)?.trim() || 'feedback',
  summaryTable: (env.VITE_SUMMARY_TABLE as string | undefined)?.trim() || 'executive_summaries',
}

export const isSupabaseConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey)
