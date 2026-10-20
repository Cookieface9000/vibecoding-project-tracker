-- Demo project + tasks so the app isn't empty on first load.
-- Run after schema.sql: Dashboard → SQL Editor → paste → Run.
-- Due dates are relative to today so every urgency colour shows: on track, due soon, overdue, done.

-- Placeholder members and colour labels.
insert into public.members (name) values ('Me'), ('Alex Morgan'), ('Sam Patel'), ('Jordan Lee'), ('Riley Chen')
on conflict (name) do nothing;
insert into public.labels (name, color) values
  ('Frontend', 'blue'), ('Backend', 'violet'), ('Design', 'pink'),
  ('Infrastructure', 'orange'), ('Docs', 'teal'), ('Research', 'slate')
on conflict (name) do nothing;

with p as (
  insert into public.projects (name, code, client, description)
  values ('Customer Portal', 'CP', 'Internal', 'Self-service portal for account settings and billing.')
  returning id
),
links as (
  insert into public.deliverables (project_id, kind)
  select p.id, k from p, unnest(array['presentation', 'demo', 'report', 'documentation']) as k
)
insert into public.tasks (project_id, title, description, type, status, assignee, due_date, context, context_tool, context_updated_at)
select p.id, t.* from p, (values
  ('Add rate limiting to /login',
   'Throttle repeated failed sign-ins per IP and per account.',
   'feature', 'todo', 'Me', current_date + 4, '', null::text, null::timestamptz),

  ('Migrate user settings to new API',
   'Move settings reads/writes from the legacy endpoint to /v2/settings.',
   'feature', 'in-progress', 'Me', current_date,
   E'## Context\n**Background**\nLegacy /settings endpoint is being retired end of month.\n\n**Constraints**\n- No downtime; dual-read until backfill completes.\n\n**Tried so far**\nGenerated the v2 client; reads work, writes fail validation.\n\n**Pick up**\nFix the timezone field mapping, then switch writes.',
   'Claude', now() - interval '2 hours'),

  ('Checkout total rounds incorrectly',
   'Totals with 3+ discounted items are off by 1 cent.',
   'bug', 'review', 'Me', current_date - 1, '', null, null),

  ('Set up CI pipeline',
   'Lint, typecheck and build on every pull request.',
   'feature', 'done', 'Me', current_date - 2, '', null, null)
) as t(title, description, type, status, assignee, due_date, context, context_tool, context_updated_at);

-- Demo prompt history for the in-progress task.
insert into public.task_prompts (task_id, tool, prompt, created_at)
select t.id, v.tool, v.prompt, now() - v.ago
from public.tasks t,
  (values
    ('Claude', E'Here is our legacy /settings client (pasted). Generate a typed client for /v2/settings with the same method names. Keep the timezone field as an IANA string.', interval '1 day 3 hours'),
    ('Claude', E'Writes to /v2/settings fail with 422 "timezone: invalid". Request body attached. What is wrong with the mapping?', interval '5 hours'),
    ('Cursor', E'Add a dual-read wrapper: read v2 first, fall back to legacy on 404, and log which source answered.', interval '2 hours')
  ) as v(tool, prompt, ago)
where t.title = 'Migrate user settings to new API';

-- Labels and a due time on the demo tasks.
update public.tasks set label_id = (select id from public.labels where name = 'Backend')
  where title in ('Add rate limiting to /login', 'Migrate user settings to new API');
update public.tasks set label_id = (select id from public.labels where name = 'Frontend')
  where title = 'Checkout total rounds incorrectly';
update public.tasks set label_id = (select id from public.labels where name = 'Infrastructure')
  where title = 'Set up CI pipeline';
update public.tasks set due_time = '17:00' where title = 'Migrate user settings to new API';
