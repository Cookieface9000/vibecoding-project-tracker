-- Demo project + tasks so the app isn't empty on first load.
-- Run after schema.sql: Dashboard → SQL Editor → paste → Run.
-- Due dates are relative to today so every urgency colour shows: on track, due soon, overdue, done.

-- Placeholder members and colour labels.
insert into public.members (name, username) values
  ('Me', 'me'), ('Alex Morgan', 'alex.morgan'), ('Sam Patel', 'sam.patel'), ('Jordan Lee', 'jordan.lee'), ('Riley Chen', 'riley.chen')
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

-- Teams (joined by code) and who is in them. "Me" is the current user until auth exists.
insert into public.teams (name, code, description) values
  ('Platform Team', 'VT-PLAT', 'Core platform, auth and account services.'),
  ('Payments Squad', 'VT-PAYS', 'Checkout, billing and payment providers.'),
  ('Design Guild', 'VT-DSGN', 'Design system and UX research.')
on conflict (code) do nothing;

insert into public.team_members (team_id, member_id, role)
select t.id, m.id, v.role
from (values
  ('VT-PLAT', 'Me', 'owner'), ('VT-PLAT', 'Alex Morgan', 'member'), ('VT-PLAT', 'Sam Patel', 'member'),
  ('VT-PAYS', 'Me', 'member'), ('VT-PAYS', 'Jordan Lee', 'owner'), ('VT-PAYS', 'Riley Chen', 'member'),
  ('VT-DSGN', 'Alex Morgan', 'owner'), ('VT-DSGN', 'Riley Chen', 'member')
) as v(code, member, role)
join public.teams t on t.code = v.code
join public.members m on m.name = v.member
on conflict do nothing;

-- The demo project is Me's, in Platform Team.
update public.projects p set
  created_by = (select id from public.members where name = 'Me'),
  team_id = (select t.id from public.teams t where t.code = 'VT-PLAT')
where p.code = 'CP';

-- Projects created by teammates: two shared with Me, one in a team Me isn't in (hidden).
with new_projects as (
  insert into public.projects (name, code, client, description, team_id, created_by)
  select v.name, v.pcode, v.client, v.descr, t.id, m.id
  from (values
    ('Mobile App Redesign', 'MAR', 'Internal', 'New navigation and onboarding for the iOS and Android apps.', 'VT-PLAT', 'Alex Morgan'),
    ('Fraud Detection Rules', 'FDR', 'Risk & Compliance', 'Rule engine for flagging suspicious payments.', 'VT-PAYS', 'Jordan Lee'),
    ('Icon Library Refresh', 'ICON', 'Internal', 'Redraw the product icon set on a 24 px grid.', 'VT-DSGN', 'Alex Morgan')
  ) as v(name, pcode, client, descr, tcode, creator)
  join public.teams t on t.code = v.tcode
  join public.members m on m.name = v.creator
  returning id, code
),
links as (
  insert into public.deliverables (project_id, kind)
  select np.id, k from new_projects np, unnest(array['presentation', 'demo', 'report', 'documentation']) as k
)
insert into public.tasks (project_id, title, description, type, status, assignee, due_date)
select np.id, v.title, v.descr, v.type, v.status, v.assignee, current_date + v.days
from new_projects np
join (values
  ('MAR', 'Prototype new tab bar', 'Five-tab layout with a floating create button.', 'feature', 'in-progress', 'Alex Morgan', 3),
  ('MAR', 'Onboarding skips step 2 on Android', 'Back gesture jumps past permissions.', 'bug', 'todo', 'Me', 1),
  ('FDR', 'Velocity rule for card testing', 'Flag more than 5 small charges per minute per card.', 'feature', 'review', 'Jordan Lee', -1),
  ('FDR', 'Export flagged payments to CSV', 'For the weekly compliance review.', 'feature', 'todo', 'Riley Chen', 6),
  ('ICON', 'Audit current icon usage', 'List every icon used in the product.', 'feature', 'todo', 'Alex Morgan', 5)
) as v(pcode, title, descr, type, status, assignee, days) on v.pcode = np.code;

-- Prompt history spread over ~12 days for the Insights timeline.
insert into public.task_prompts (task_id, tool, prompt, created_at)
select t.id, v.tool, v.prompt, now() - v.ago
from public.tasks t
join public.projects p on p.id = t.project_id
join (values
  ('CP', 'Add rate limiting to /login', 'Claude', 'Design a sliding-window rate limiter for /login keyed by IP and account. Redis is available.', interval '11 days'),
  ('CP', 'Add rate limiting to /login', 'Cursor', 'Implement the limiter as Express middleware with unit tests.', interval '9 days'),
  ('CP', 'Set up CI pipeline', 'ChatGPT', 'Write a GitHub Actions workflow: lint, typecheck, build on every PR, cache npm.', interval '10 days'),
  ('CP', 'Set up CI pipeline', 'Claude', 'The build step fails on Windows runners with EPERM; how do I fix it?', interval '8 days'),
  ('CP', 'Checkout total rounds incorrectly', 'Claude', 'Totals are off by 1p with 3+ discounts. Here is the reducer. Find the rounding bug.', interval '4 days'),
  ('CP', 'Checkout total rounds incorrectly', 'Cursor', 'Switch money maths to integer pence and add property tests.', interval '3 days'),
  ('CP', 'Checkout total rounds incorrectly', 'Claude', 'Review the diff for edge cases with percentage + fixed discounts.', interval '1 day'),
  ('MAR', 'Prototype new tab bar', 'Lovable', 'Prototype a five-tab mobile nav with a floating create button.', interval '6 days'),
  ('MAR', 'Prototype new tab bar', 'Claude', 'Make the tab bar accessible: labels, focus order, 44pt targets.', interval '2 days'),
  ('MAR', 'Onboarding skips step 2 on Android', 'ChatGPT', 'Android back gesture skips the permissions step. How to intercept it in React Navigation?', interval '1 day')
) as v(pcode, title, tool, prompt, ago) on v.pcode = p.code and v.title = t.title;

update public.tasks set
  context = E'## Context\n**Background**\nCheckout totals with 3+ discounted items are off by 1p.\n\n**Constraints**\n- Must not change displayed prices.\n\n**Tried so far**\nFound float maths in the discount reducer.\n\n**Pick up**\nFinish moving to integer pence; review edge cases.',
  context_tool = 'Claude',
  context_updated_at = now() - interval '1 day'
where title = 'Checkout total rounds incorrectly';

-- Handoff + move history for the handoff map.
insert into public.task_events (task_id, project_id, kind, from_value, to_value, actor, created_at)
select t.id, t.project_id, v.kind, v.from_value, v.to_value, v.actor, now() - v.ago
from public.tasks t
join public.projects p on p.id = t.project_id
join (values
  ('CP', 'Migrate user settings to new API', 'handoff', 'Me', 'Alex Morgan', 'Me', interval '6 days'),
  ('CP', 'Migrate user settings to new API', 'handoff', 'Alex Morgan', 'Jordan Lee', 'Alex Morgan', interval '2 days'),
  ('CP', 'Checkout total rounds incorrectly', 'handoff', 'Sam Patel', 'Me', 'Sam Patel', interval '5 days'),
  ('CP', 'Checkout total rounds incorrectly', 'moved', 'in-progress', 'review', 'Me', interval '1 day'),
  ('CP', 'Set up CI pipeline', 'handoff', 'Me', 'Sam Patel', 'Me', interval '10 days'),
  ('CP', 'Set up CI pipeline', 'handoff', 'Sam Patel', 'Me', 'Sam Patel', interval '8 days'),
  ('CP', 'Set up CI pipeline', 'moved', 'review', 'done', 'Me', interval '7 days'),
  ('CP', 'Add rate limiting to /login', 'handoff', 'Alex Morgan', 'Me', 'Alex Morgan', interval '9 days'),
  ('MAR', 'Prototype new tab bar', 'handoff', 'Me', 'Alex Morgan', 'Me', interval '4 days'),
  ('MAR', 'Onboarding skips step 2 on Android', 'handoff', 'Alex Morgan', 'Me', 'Alex Morgan', interval '1 day')
) as v(pcode, title, kind, from_value, to_value, actor, ago) on v.pcode = p.code and v.title = t.title;

-- Dependencies ("blocked by").
insert into public.task_dependencies (task_id, depends_on)
select a.id, b.id
from (values
  ('CP', 'Checkout total rounds incorrectly', 'Migrate user settings to new API'),
  ('CP', 'Migrate user settings to new API', 'Set up CI pipeline'),
  ('CP', 'Add rate limiting to /login', 'Set up CI pipeline'),
  ('MAR', 'Onboarding skips step 2 on Android', 'Prototype new tab bar')
) as v(pcode, task, blocker)
join public.projects p on p.code = v.pcode
join public.tasks a on a.project_id = p.id and a.title = v.task
join public.tasks b on b.project_id = p.id and b.title = v.blocker
on conflict do nothing;

-- ── A second user to test teams with ────────────────────────────────────────
-- "User 2" is in no team except their own, Studio Two (code VT-STU2), which has one project.
insert into public.members (name, username) values ('User 2', 'user2')
on conflict (name) do nothing;

insert into public.teams (name, code, description)
select 'Studio Two', 'VT-STU2', 'User 2''s team, for testing joining, leaving and removing members.'
where not exists (select 1 from public.teams where code = 'VT-STU2');

insert into public.team_members (team_id, member_id, role)
select t.id, m.id, 'owner' from public.teams t, public.members m
where t.code = 'VT-STU2' and m.name = 'User 2'
on conflict do nothing;

with team as (select id from public.teams where code = 'VT-STU2'),
     owner as (select id from public.members where name = 'User 2'),
     p as (
       insert into public.projects (name, code, client, description, team_id, created_by)
       select 'Side Project', 'SIDE', 'Studio Two', 'Only visible to members of Studio Two. Join with code VT-STU2 to see it.', team.id, owner.id
       from team, owner
       where not exists (select 1 from public.projects where code = 'SIDE' and team_id = team.id)
       returning id
     ),
     links as (
       insert into public.deliverables (project_id, kind)
       select p.id, k from p, unnest(array['presentation', 'demo', 'report', 'documentation']) as k
     )
insert into public.tasks (project_id, title, description, type, status, assignee, due_date, created_at)
select p.id, t.title, t.description, 'feature', t.status, 'User 2', current_date + t.days, now() - t.ago
from p, (values
  ('Sketch the onboarding flow', 'Three screens: welcome, connect, first task.', 'todo', 4, interval '3 minutes'),
  ('Pick a colour palette', 'Two options to show the team.', 'in-progress', 1, interval '2 minutes'),
  ('Write the README', 'How to run it locally.', 'done', -1, interval '1 minute')
) as t(title, description, status, days, ago);
