-- NaijaPay Health — feedback table
-- Run once in your Supabase project: SQL Editor → New query → paste → Run.
-- Project: https://grqclcwwqodibpgfuhcq.supabase.co
-- Safe to re-run (idempotent).

create extension if not exists pgcrypto;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  email text,
  path text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

-- Postgres checks table GRANTS before RLS, so grant the role its privilege first.
grant usage on schema public to anon, authenticated;
grant insert on public.feedback to anon, authenticated;

alter table public.feedback enable row level security;

-- Allow the publishable (anon) key to INSERT only. No SELECT grant/policy, so the
-- table stays private: rows are readable only from the dashboard / secret key.
drop policy if exists "feedback_public_insert" on public.feedback;
create policy "feedback_public_insert"
  on public.feedback
  for insert
  to anon, authenticated
  with check (char_length(message) between 1 and 2000);
