# Vibe Tracker — Design

**Status:** v1 · tokens live in `tailwind.config.js`.

---

## 1. Mood / vibe
**Calm, clean workspace where the important things jump out.** Quiet surfaces, with colour reserved for meaning: type, stage and urgency.

**References**
- Agency/project-management workspaces (Productive-style): a dark charcoal sidebar, a white project header with a status label and project code, section tabs, uppercase column titles with coloured underlines, and flat white cards.
- Linear: crisp type, restrained chrome.

## 1a. Layout and navigation
**Flow:** Projects list → click a project → that project's board (tickets) → open a ticket (task modal, coming next).

| Screen | Route | Contents |
|---|---|---|
| **Projects** (home) | `/` | Header ("Projects", **New project**, theme). A grid of project cards: name, `#CODE`, client, status, description, a stage-breakdown bar, counts, an **overdue** badge and "Open board ›". An empty state invites you to create the first project. |
| **Project board** | `/projects/[id]` | Breadcrumb (Projects › Name). Header: name, status label, `#CODE`, client. Tabs (Tasks). An urgency legend. Four columns of tickets. |
| **New project** | `/projects/new` | A form: **name** (required), **code** (filled in automatically from the name, editable, 2–6 characters), **client/stakeholder**, **description**. Create → lands on the new project's empty board. |

**Sidebar (always visible, dark):** wordmark → green **New project** button → **All projects** → a **Projects** list (name + `#CODE`). The current item is highlighted green.

**Anti-references**
- A wall of identical grey cards where nothing stands out.
- Rainbow dashboards with colour that means nothing.

## 2. Colour palette
Light and dark mode. Colours follow the conventions engineers already know from traffic lights, CI and issue trackers, so the board reads with no legend.

### Colour meanings (the rules)
| Colour | Means | Used for | Never used for |
|---|---|---|---|
| 🔴 **Red** | Problem / act now | Bugs, overdue work | Decoration, brand, success |
| 🟠 **Amber** | Attention soon | Due within 24 h | Errors, success |
| 🟢 **Green** | Good / go / finished | On-track due dates, Done stage, **brand: create actions, active nav, the Active project status** | Warnings, bugs |
| 🔵 **Blue** | Active work in motion | In Progress stage | Urgency |
| 🟣 **Violet** | Waiting on judgement | Review stage | Urgency |
| 🟦 **Indigo** | Building something new | Feature tickets | Problems |
| ⚪ **Grey** | Inactive / not started / closed | To Do stage, done cards, no due date | Anything needing action |

**Principles**
1. **Red is reserved for problems.** If something is red, it needs attention. An overdue bug is red on red: the most urgent thing on the board should look it.
2. **Traffic-light urgency:** green → amber → red as the deadline approaches. Done always drops to grey, so finished work stops calling for attention.
3. **One meaning per channel:** a card's **stripe and chip** show its *type*; its **background tint** shows *urgency*; the **column header** shows *stage*. Overlapping hues therefore never contradict each other.
4. **Never colour alone:** every colour comes with an icon and/or text (bug icon, clock, "2 days overdue") for colour-blind users and WCAG 2.1 AA.
5. **Saturation = importance:** quiet surfaces, with saturated colour only on things that need a decision.

### Brand and surfaces
| Token | Light | Dark | Where |
|---|---|---|---|
| `brand` | `#16A34A` | `#22C55E` | New project / create buttons, active nav, active tab, focus rings |
| `surface-sidebar` | `#1F2124` | `#15171A` | Dark charcoal sidebar (dark in both themes) |
| `surface-header` | `#FFFFFF` | `#15171A` | Page/project header and tabs |
| `surface-page` | `#F7F7F8` | `#0E1013` | Board background (columns sit directly on it, with no tray) |
| `surface-card` | `#FFFFFF` | `#1C1F24` | Tickets, project cards, forms |

### Project status label
| Status | Colour | Icon |
|---|---|---|
| Active | green | activity pulse |
| On hold | amber | pause |
| Completed | grey | check circle |
| `text-primary` | `#0F172A` | `#E2E8F0` | Body text |
| `text-muted` | `#64748B` | `#94A3B8` | Captions, dates, counts |

### Stage (uppercase column title + 3 px coloured underline; project-card stage bar)
| Stage | Token | Hex | Icon | Why |
|---|---|---|---|---|
| To Do | `stage-todo` | `#64748B` grey | circle | Not started, inactive |
| In Progress | `stage-progress` | `#2563EB` blue | half-filled circle | Active work, calm motion |
| Review | `stage-review` | `#7C3AED` violet | eye | Waiting on someone's judgement |
| Done | `stage-done` | `#16A34A` green | check circle | Success / complete |

### Task type (left stripe + chip + corner icon)
| Type | Token | Hex | Icon | Why |
|---|---|---|---|---|
| Feature | `type-feature` | `#4F46E5` indigo | sparkles | Building something new, constructive |
| Bug | `type-bug` | `#DC2626` red | bug | A defect is a problem; red is the universal bug colour (GitHub, Jira) |

### Due-date urgency (card tint + due chip): traffic light
| State | Token | Hex | Rule | Chip text | Icon |
|---|---|---|---|---|---|
| On track | `due-safe` | `#16A34A` green | More than 24 h out | "5 days left" | calendar |
| Due soon | `due-warning` | `#F59E0B` amber | Less than 24 h | "Due today" | clock |
| Overdue | `due-overdue` | `#DC2626` red | Past due | "2 days overdue" | alarm clock |
| Done | `due-neutral` | `#94A3B8` grey | Done (overrides date) | "Completed" | check |
| No date | — | card default | No due date | — | — |

Card tints are **light** (about 6–10% of the hue on white, or 10% on the dark card) with a stronger ring, so text keeps AA contrast in both themes.

### Priority (reserved for when a `priority` field is added)
| Priority | Hex | Icon |
|---|---|---|
| Critical | `#DC2626` red | double chevron up |
| High | `#EA580C` orange | chevron up |
| Medium | `#CA8A04` yellow | equals |
| Low | `#64748B` grey | chevron down |

## 3. Typography
| Role | Font | Why |
|---|---|---|
| Heading | Plus Jakarta Sans | Friendly, geometric, with more character than the body font |
| Body | Inter | Highly legible at 12–14 px |
| Mono (IDs, code, context) | JetBrains Mono | Clear for prompts and Markdown |

Sizes: page/project title 24 px medium · column title 13 px semibold UPPERCASE, letter-spaced, with a muted (count) · ticket title 15 px medium · body 13 px · caption 11–12 px muted · sidebar items 15 px.

## 4. Component principles
- **Tickets (compact, uniform):** every ticket is the **same fixed height (88 px)**, so columns stack and line up. Content:
  1. Title, at most 2 lines (clamped).
  2. One meta row pinned to the bottom: **type icon** · **due chip** · **avatar** (right).

  No description, AI tool or context on the card; those live in the modal. A **3 px left stripe** shows type, and the **tint and border** show urgency. 8 px gap between tickets.
- **Ticket modal (click any ticket):** a native `<dialog>` (Esc and backdrop click close it, focus returns to the ticket). It has:
  - **Header:** `#CODE` + type chip + title, with a type-coloured left edge.
  - **Key facts:** a fixed 2×2 grid of Status (stage dot), Assignee, Due date (date + urgency chip) and Created.
  - **Description**, then **Context** (monospace, scrollable, "Claude · updated 2 h ago").
  - **Prompt history:** a vertical timeline, newest first, with an AI-tool badge, relative time (exact time on hover) and the prompt in monospace.
  - **Empty states** use dashed boxes.
- **Columns:** no tray. An uppercase title with a muted count, then a 3 px coloured underline, then tickets, so each stage reads differently at a glance. An empty column shows a dashed placeholder the **same height as a ticket**.
- **Alignment:** all columns share one top line. Project cards stretch to equal height, with a fixed 2-line description slot and the stage bar pinned to the bottom.
- **Project cards:** white, rounded-xl. A **stage bar** (stage colours, proportional to task counts), an **overdue** badge in red, and "Open board ›" in brand green. The whole card is the link.
- **Sidebar:** dark charcoal in both themes. Muted grey icons, white text on hover, brand green for the active item. The **New project** button is solid green at the top.
- **Project header:** breadcrumb → name + outlined status label → `#CODE` tag (green left edge) · client → tabs with a green underline on the active tab.
- **Buttons:** solid brand green for primary/create, outlined white for secondary, rounded-lg, visible focus ring.
- **Chips:** the type chip is outlined and UPPERCASE with an icon. The due chip is tinted with an icon and text. Never colour alone.
- **Forms:** labelled fields, required fields marked *, inline red alert for server errors, and values kept after an error.
- **Modal:** centred, max-w-lg, dark backdrop at 50% with blur.
- **Empty states:** dashed border, muted text, encouraging.
- **Drag and drop:** drag a ticket to another column to change its status.
  - **Picking up:** after a 6 px move, so a plain click still opens the ticket. While dragging, a tilted copy with a green ring follows the cursor, the original fades to 40%, and the target column highlights with a green tint and inset ring.
  - **Saving:** the move shows instantly and saves in the background. If the save fails it rolls back and shows a red alert above the board.
  - **Keyboard:** focus a ticket, **Space** to pick it up, **← / →** to change column, **Space** to drop, **Esc** to cancel. Screen readers announce each step.
- **Task form (add / edit):** the same modal for both.
  - **Fields:** Title*, Description, Type (Feature/Bug toggle), Status, Assignee, Due date.
  - **Adding:** "Add task" in the toolbar adds to To Do. "+ Add task" under a column adds to that column.
  - **Deleting:** inline confirmation in the footer ("Delete this task? This can't be undone." Delete / Keep).
  - **Moving between views:** View → **Edit** → Save or Cancel (back to the view).

## 5. Voice / microcopy
| Where | Text |
|---|---|
| "+" button | "Add task" |
| Create project button | "New project" → "Create project" (while saving: "Creating…") |
| No projects | "Create your first project" |
| Project card link | "Open board ›" |
| Empty column | "Nothing here yet." |
| Copy Context toast | "Copied. Paste it into your AI." |
| Confirm delete | "Delete this task? This can't be undone." |
| Handoff toast | "Handed off to {name}." |

## 6. Wordmark
- **Product name:** Vibe Tracker
- **Wordmark:** the name in the heading font next to a small brand-coloured square badge.

## 7. Scope notes
- **Dark mode is in scope.** A toggle in the header remembers the choice and defaults to the OS setting.
- Icons: [Lucide](https://lucide.dev) (`lucide-react`).
- Motion: 150–200 ms hover/fade only.
