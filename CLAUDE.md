# TaskFlow - Personal Task Management SaaS

## Project Overview
Full-stack task management app with Sunsama-inspired calm UI.
Start-date-based task visibility, time-block daily planning, single-user auth.

## Tech Stack
- **Framework**: Next.js 15 (App Router, Server Actions, Turbopack)
- **UI**: Tailwind CSS v4 + shadcn/ui + Lucide Icons
- **Database**: Drizzle ORM + Neon PostgreSQL (serverless HTTP driver)
- **Auth**: Auth.js v5 beta (Credentials Provider, JWT strategy)
- **Validation**: Zod
- **Theme**: next-themes (light/dark)
- **Toasts**: Sonner
- **Dates**: date-fns

## Project Structure
```
src/
├── app/              # Next.js App Router pages
│   ├── (auth)/       # Login page (public)
│   └── (app)/        # Main app (authenticated)
│       ├── today/    # Daily plan view
│       ├── tasks/    # List view
│       └── projects/ # Project detail
├── actions/          # Server Actions (CRUD)
├── db/               # Schema, client, migrations, seed
├── lib/              # Auth config, validators, utils
├── hooks/            # Client-side hooks
└── components/
    ├── ui/           # shadcn/ui components
    ├── layout/       # AppShell, Sidebar, Header
    ├── task/         # TaskCard, TaskForm, TaskList
    ├── project/      # ProjectBadge, ProjectForm
    ├── label/        # LabelBadge, LabelPicker
    └── daily-plan/   # DayHeader, TimeBlockSection
```

## Development Commands
```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
npx drizzle-kit push # Push schema to DB
npx drizzle-kit generate  # Generate migration
```

## Verify (run before every commit)
```bash
npx tsc --noEmit && npm run build && npm run lint
```

## MCP Server (`mcp-server/`)
Standalone stdio MCP server for Claude Code integration. 17 tools:

**Read**: `list_today_tasks`, `list_all_tasks`, `get_task`, `search_tasks`, `get_overdue`
**Write**: `create_task`, `update_task`, `delete_task`, `complete_task`
**Quick**: `set_priority`, `set_timeblock`, `set_key_task`, `get_daily_stats`
**AI**: `split_task`, `arrange_today`, `batch_update`

```bash
# MCP server verify
cd mcp-server && npx tsc --noEmit && npm run build
```

## Architecture Decisions
- **Server Actions over REST**: Automatic CSRF, integrated revalidation
- **UUID primary keys**: Client-side ID generation for optimistic UI
- **Fractional indexing**: position field (real type) for efficient reordering
- **Soft delete**: deletedAt timestamps, never hard-delete user data
- **JWT sessions**: No DB session table needed for single-user
- **startDate visibility**: Tasks hidden from "Today" until startDate arrives
- **timeBlock enum**: morning/afternoon/evening/unscheduled for day planning
