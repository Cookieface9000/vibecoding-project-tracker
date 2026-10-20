# Vibe Tracker — PRD

**Status:** v2 draft · Next.js + TypeScript + Supabase

---

## 1. Problem
Software engineers who build with AI tools lose track of two things:
1. **Work state:** which tasks are in progress, blocked or in review, and who owns them.
2. **AI context:** the background, constraints and prompts that got the AI to produce working code. When the work changes hands (to a teammate, to another AI tool, or to yourself next week), that context is gone, and the work starts again from scratch.

Jira, Linear and Notion track work well but know nothing about AI context. Prompt libraries store prompts but don't connect them to tasks or ownership.

## 2. Target users
- **Individual engineers** using AI coding tools (Claude, ChatGPT, Cursor and others) who want a lightweight personal board that remembers the context behind each task.
- **Engineering teams** in any company who hand AI-assisted work between people and need a shared view of status, ownership and context.
- **Stakeholders** (PMs, leads, clients) who need to see progress and key project links at a glance, without reading code or chat logs.

## 3. Product overview
- A **Kanban board**: To Do → In Progress → Review → Done.
- A **context briefing** on every task, with **one-click Copy Context**, ready to paste into any AI tool or hand to a colleague.
- **Ownership and handoff**: every task has an owner and can be handed off in one step.
- **Pinned project links** above the board (Presentation, Demo, Report, Documentation) for stakeholders.
- Works the same for one person or a whole team.

## 4. Primary flows
1. **Track:** add a task (title, description, type, owner, due date, context) and move it through the stages.
2. **Resume with AI:** open a task, press **Copy Context**, paste it into an AI tool and continue straight away.
3. **Hand off:** reassign a task. The new owner gets the full context, not just a title.
4. **Report:** stakeholders check the board's colours and the pinned links to see status at a glance.

---

## 5. Functional requirements
Priority: **Must** = v1 · **Should** = v1 if time allows · **Could** = later

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Four columns in a fixed order, with task counts. | Must |
| FR-2 | Cards show title, owner, type and due status. | Must |
| FR-3 | Create a task from an "Add task" button using a modal form. | Must |
| FR-4 | Click a card to open the same modal pre-filled; edit and save. | Must |
| FR-5 | Delete a task, with confirmation. | Must |
| FR-6 | Change status from the modal through a dropdown. | Must |
| FR-7 | Feature and bug tasks look distinct (colour + icon), consistently everywhere. | Must |
| FR-8 | The owner is visible on every card; "Hand off to…" reassigns with visible confirmation. | Must |
| FR-9 | Cards are tinted automatically by due date: >24 h calm, <24 h warning, past due alarm, Done neutral. | Must |
| FR-10 | A Markdown context field per task, an optional AI-tool tag and an auto-set "last updated" time. New tasks start from a template (Background / Constraints / Tried so far / Pick up). | Must |
| FR-11 | Copy Context (on cards and in the modal) copies title, description and context as clean Markdown. | Must |
| FR-12 | Four pinned project-link slots, each with a URL and a set/empty indicator. | Must |
| FR-13 | Light/dark theme toggle that remembers the choice. | Must |
| FR-14 | Manage team members: add, rename and remove the people who can own tasks. | Should |
| FR-15 | Live Markdown preview for context. | Could |
| FR-16 | Drag-and-drop between columns. | Could |
| FR-17 | Accounts and multiple workspaces (personal and per team), with invites. | Could |
| FR-18 | Activity history per task: status changes, handoffs, context edits. | Could |

## 6. Non-functional requirements

| ID | Area | Requirement |
|---|---|---|
| NFR-1 | Security | The Supabase secret key is used **only on the server**, lives in `.env` (gitignored) and host env vars, and is never exposed with a `NEXT_PUBLIC_` prefix. |
| NFR-2 | Security | RLS is on with no public policies; all data access goes through validated server code. |
| NFR-3 | Access | Team deployments must restrict access to members (hosting-level protection in v1, real auth when FR-17 lands). |
| NFR-4 | Privacy | No secrets, personal data or local paths in the repo, commits or PRs. Context fields may hold sensitive project details, so they are never sent anywhere except the user's clipboard. |
| NFR-5 | Performance | The board renders in under 1 s with about 200 tasks. Actions feel instant (under 300 ms perceived). |
| NFR-6 | Reliability | Data persists in Postgres. Clear on-screen errors when the DB is unreachable or not set up. |
| NFR-7 | Accessibility | WCAG 2.1 AA contrast in both themes. Colour is never the only signal (always paired with an icon or text). Fully keyboard-usable. |
| NFR-8 | Responsiveness | Four columns fit at 1280 px. The layout stacks cleanly on tablet and phone widths. |
| NFR-9 | Maintainability | TypeScript strict mode. Shared types and constants in `src/lib/types.ts`. Design tokens in `tailwind.config.js`. |
| NFR-10 | Portability | Deploys to Vercel (or any Node host) with only env vars to configure. |

## 7. Data requirements

**Storage:** Supabase Postgres. Schema in `supabase/schema.sql`, demo data in `supabase/seed.sql`. The DB uses snake_case and the app uses camelCase, mapped in `src/lib/data.ts`. Constraints are enforced in both the DB and the server actions.

### `tasks`
| Field (app / DB) | Type | Rules |
|---|---|---|
| `id` | uuid | Generated by the DB |
| `title` | text | Required, trimmed |
| `description` | text | Defaults to `''` |
| `type` | text | `feature` \| `bug` |
| `status` | text | `todo` \| `in-progress` \| `review` \| `done` |
| `assignee` | text | Must be a current member (see `members`) |
| `dueDate` / `due_date` | date | Optional, `YYYY-MM-DD` |
| `createdDate` / `created_date` | date | Set by the DB |
| `context` | text | Markdown, defaults to `''` |
| `contextTool` / `context_tool` | text | `Claude` \| `ChatGPT` \| `Cursor` \| `Lovable` \| `Replit` \| `Other` \| null |
| `contextUpdatedAt` / `context_updated_at` | timestamptz | Set by the server **only when the context changes** |

### `members` (FR-14; replaces the hard-coded `TEAM` list)
| Field | Type | Rules |
|---|---|---|
| `id` | uuid | Generated by the DB |
| `name` | text | Required, unique, shown as initials on cards |

A personal board has one member. A team board has several.

### `deliverables` (pinned project links)
| Field | Type | Rules |
|---|---|---|
| `kind` | text (PK) | `presentation` \| `demo` \| `report` \| `documentation` |
| `url` | text | `''` or an `http(s)://` URL |

### Later (FR-17)
`workspaces` (personal or team) and `workspace_members` (user, role). Every table gains a `workspace_id`, and RLS policies scope rows to members.

---

## 8. Tech stack
| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS + Lucide icons; tokens from `DESIGN.md` |
| Data | Supabase Postgres via server components and server actions |
| Hosting | Vercel |

## 9. Out of scope for v1
- Accounts, workspaces and invites (FR-17 is planned for later).
- Real-time multi-user sync. Updates appear on refresh.
- Integrations (GitHub, Slack, Jira import).
- Sending context to AI APIs directly. v1 is copy-to-clipboard only.

## 10. Success criteria
- An engineer can go from "open task" to "pasted into AI with full context" in under 5 seconds.
- A handoff carries the full context, with no follow-up message needed.
- A stakeholder can tell what's late and what's done without asking.
