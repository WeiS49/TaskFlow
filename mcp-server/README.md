# TaskFlow MCP Server

MCP (Model Context Protocol) server for managing TaskFlow tasks via Claude Code.

## Setup

```bash
cd mcp-server
npm install
```

Create `.env` (or use the parent project's `.env`):

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

## Claude Code Configuration

Add to your `~/.claude.json` or project `.claude/settings.json`:

```json
{
  "mcpServers": {
    "taskflow": {
      "command": "npx",
      "args": ["tsx", "mcp-server/src/index.ts"],
      "cwd": "/path/to/Todo SaaS",
      "env": {
        "DATABASE_URL": "your-database-url"
      }
    }
  }
}
```

## Available Tools

### Read
| Tool | Input | Description |
|------|-------|-------------|
| `list_today_tasks` | — | Today's tasks grouped by time block |
| `list_all_tasks` | status?, priority?, projectId? | All tasks with optional filters |
| `get_task` | taskId | Full task details with subtasks/labels |
| `search_tasks` | query | Fuzzy search title + description |
| `get_overdue` | — | Tasks past due date |

### Write
| Tool | Input | Description |
|------|-------|-------------|
| `create_task` | title + optional fields | Create a new task |
| `update_task` | taskId + partial fields | Update task fields |
| `delete_task` | taskId | Soft-delete a task |
| `complete_task` | taskId | Toggle done/todo |

### Quick Actions
| Tool | Input | Description |
|------|-------|-------------|
| `set_priority` | taskId, priority | Set task priority |
| `set_timeblock` | taskId, timeBlock | Assign to time block |

### AI-Powered
| Tool | Input | Description |
|------|-------|-------------|
| `split_task` | taskId, subtasks[] | Decompose into subtasks |
| `arrange_today` | assignments[] | Batch-assign time blocks |
| `batch_update` | updates[] | Batch-update multiple tasks |

## Usage Examples

```
"Show me today's tasks"           -> list_today_tasks
"Create a task: Review PR #42"    -> create_task
"Split 'Build feature' into steps" -> split_task
"Move all morning tasks to afternoon" -> arrange_today
"What's overdue?"                  -> get_overdue
```
