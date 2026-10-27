-- Task outcomes: did a prompt or the task's context work, and why (written by a person).
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run. Safe to run again. Additive only.

create table if not exists public.task_outcomes (
  id                   uuid primary key default gen_random_uuid(),
  task_id              uuid not null references public.tasks (id) on delete cascade,
  project_id           uuid not null references public.projects (id) on delete cascade,
  subject              text not null check (subject in ('context', 'prompt')),       -- what the outcome is about
  prompt_id            uuid references public.task_prompts (id) on delete set null,  -- for subject = 'prompt'
  context_snapshot     text check (context_snapshot is null or char_length(context_snapshot) <= 20000),  -- the context as it was, for subject = 'context'
  result               text not null check (result in ('success', 'failure')),
  reason               text not null check (char_length(btrim(reason)) between 1 and 2000),
  recorded_by          text not null,                                                -- member name, or "<connection> (AI)"
  member_id            uuid references public.members (id) on delete set null,       -- the person it was recorded as / for
  source               text not null default 'human' check (source in ('human', 'ai')),
  operator_instruction text check (operator_instruction is null or char_length(operator_instruction) <= 1000),  -- AI only: the person's words that asked for it
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists task_outcomes_task_idx on public.task_outcomes (task_id, created_at);
create index if not exists task_outcomes_project_idx on public.task_outcomes (project_id, created_at desc);

alter table public.task_outcomes enable row level security;
