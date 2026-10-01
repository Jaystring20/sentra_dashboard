-- Sentra — database schema for analyzed customer feedback.
-- Run in the Supabase SQL editor. The n8n workflow inserts one row per email
-- after the AI analysis step; Sentra reads (and updates `status` on) these rows.

create table if not exists public.feedback (
  id               text primary key default ('FB-' || substr(gen_random_uuid()::text, 1, 8)),
  original_message text        not null,
  subject          text,
  source           text        not null default 'Gmail',
  received_at      timestamptz not null default now(),
  customer_name    text,
  customer_email   text,
  sentiment        text        not null check (lower(sentiment) in ('positive', 'neutral', 'negative')),
  sentiment_score  numeric     check (sentiment_score between -1 and 1),
  category         text,
  theme            text,
  issue            text,
  severity         text        not null default 'low' check (lower(severity) in ('low', 'medium', 'high', 'critical')),
  ai_summary       text,
  status           text        not null default 'new' check (status in ('new', 'in_review', 'actioned', 'resolved')),
  -- Gmail message id, lets the n8n workflow skip duplicates on re-runs
  gmail_message_id text unique,
  created_at       timestamptz not null default now()
);

create index if not exists feedback_received_at_idx on public.feedback (received_at desc);
create index if not exists feedback_theme_idx on public.feedback (theme);
create index if not exists feedback_issue_idx on public.feedback (issue);

-- Optional: AI executive summaries written by a scheduled n8n workflow.
create table if not exists public.executive_summaries (
  id           bigint generated always as identity primary key,
  summary      text        not null,
  highlights   jsonb       not null default '[]'::jsonb,
  generated_at timestamptz not null default now()
);

-- Live updates in the dashboard.
alter publication supabase_realtime add table public.feedback;

-- Row Level Security: the dashboard uses the anon key.
-- These policies allow read + status updates for a capstone/demo deployment.
-- For production, require authentication (e.g. `to authenticated`).
alter table public.feedback enable row level security;
alter table public.executive_summaries enable row level security;

create policy "dashboard can read feedback" on public.feedback for select to anon, authenticated using (true);
create policy "dashboard can update status" on public.feedback for update to anon, authenticated using (true) with check (true);
create policy "dashboard can read summaries" on public.executive_summaries for select to anon, authenticated using (true);
-- n8n should insert with the service_role key, which bypasses RLS.
