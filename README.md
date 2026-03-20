# TaskFlow

A personal task management app with a calm, Sunsama-inspired UI. Built with Next.js 15 and designed for start-date-based task visibility, time-block daily planning, and single-user self-hosting.

![TaskFlow Today View](docs/today-view.jpg)

<!-- TODO: Add demo GIF here -->

## Live Demo

Try it at your deployed URL — open registration (50 spots, first come first served).

## Features

- **Daily Plan** — Morning / Afternoon / Evening / Unscheduled time blocks with drag-and-drop
- **Week View** — 7-day calendar with cross-day drag-and-drop scheduling
- **Projects & Labels** — Organize tasks by project (color-coded) and labels
- **Priority System** — 5 levels (urgent / high / medium / low / none) with visual indicators
- **Daily Review** — Track energy, mood, and write reflections
- **Statistics** — Completion trends, mood/energy charts
- **Start Date Visibility** — Tasks stay hidden until their start date arrives
- **Data Export/Import** — Full JSON backup and restore from Settings
- **Dark/Light Theme** — Toggle via sidebar
- **MCP Server** — 17 tools for Claude Code integration (task CRUD, AI task splitting, daily arrangement)

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions, Turbopack)
- **UI**: Tailwind CSS v4 + shadcn/ui + Lucide Icons
- **Database**: Drizzle ORM + PostgreSQL (Neon serverless)
- **Auth**: Auth.js v5 (Credentials, JWT)
- **Validation**: Zod
- **Drag & Drop**: dnd-kit

## Architecture Decisions

| Decision | Why |
|----------|-----|
| **Server Actions over REST** | Automatic CSRF protection, integrated cache revalidation, less boilerplate |
| **Fractional indexing** | `position: real` enables O(1) drag-and-drop reorder without renumbering siblings |
| **startDate visibility** | Tasks hidden from Today view until their start date — reduces cognitive load |
| **Soft delete** | `deletedAt` timestamps instead of hard delete — user data is never lost |
| **JWT sessions** | Single-user app needs no DB session table — simpler, fewer queries |
| **Neon HTTP driver** | `@neondatabase/serverless` for reliable connections in serverless environments |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or [Neon](https://neon.tech))

### Setup

```bash
# Clone
git clone https://github.com/WeiS49/TaskFlow.git
cd taskflow

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and generate AUTH_SECRET:
#   openssl rand -base64 32

# Push schema to database
npx drizzle-kit push

# Seed admin user
npx tsx src/db/seed.ts

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the credentials from your `.env` file.

### MCP Server (Optional)

The MCP server allows Claude Code to manage your tasks directly.

```bash
cd mcp-server
npm install
npm run build
```

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "taskflow": {
      "type": "stdio",
      "command": "node",
      "args": ["<path-to>/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "your-database-url"
      }
    }
  }
}
```

## Scripts

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
npx drizzle-kit push # Push schema to DB
```

## License

MIT
