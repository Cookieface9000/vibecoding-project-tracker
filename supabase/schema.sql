-- Vibecoding Project Tracker schema.
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.

create table if not exists public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text not null default '',
  type                text not null default 'feature' check (type in ('feature', 'bug')),
  status              text not null default 'todo'
                        check (status in ('todo', 'in-progress', 'review', 'done')),
  assignee            text not null default 'Me',
  due_date            date,
  created_date        date not null default current_date,
  context             text not null default '',
  context_tool        text check (context_tool in ('Claude', 'ChatGPT', 'Cursor', 'Lovable', 'Replit', 'Other')),
  context_updated_at  timestamptz,
  created_at          timestamptz not null default now()
);

create table if not exists public.deliverables (
  kind  text primary key check (kind in ('presentation', 'demo', 'report', 'documentation')),
  url   text not null default ''
);

insert into public.deliverables (kind) values
  ('presentation'), ('demo'), ('report'), ('documentation')
on conflict (kind) do nothing;

-- RLS on with NO policies: the public (publishable/anon) key can read or write nothing.
-- The app talks to Supabase only from the server with the secret key, which bypasses RLS.
alter table public.tasks enable row level security;
alter table public.deliverables enable row level security;
