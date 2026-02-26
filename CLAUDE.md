# BookMark - Smart Bookmark Manager

## Project Overview
Chrome Extension + FastAPI backend for AI-powered bookmark management.
Save URLs with one click → auto-extract content → AI summarization + tagging → search/browse via Web UI.

## Tech Stack
- **Backend**: FastAPI + SQLModel + SQLite (sync) + Jinja2 + htmx
- **Extension**: TypeScript + Vite + CRXJS (Manifest V3)
- **AI**: google-genai SDK (Gemini 2.5 Flash), abstract provider pattern
- **Content Extraction**: readability-lxml + BeautifulSoup4

## Project Structure
- `api/` — Python backend (FastAPI)
- `extension/` — Chrome Extension (TypeScript)

## Development Commands

### Backend (api/)
```bash
cd api && uv run uvicorn app.main:app --reload     # Dev server
cd api && uv run ruff check .                        # Lint
cd api && uv run ruff check . --fix                  # Auto-fix lint
cd api && uv run pytest                              # Tests
```

### Extension (extension/)
```bash
cd extension && npm run dev      # Dev with HMR
cd extension && npm run build    # Production build
cd extension && npx tsc --noEmit # Type check
```

### Verify (both)
```bash
cd api && uv run ruff check . && cd ../extension && npx tsc --noEmit && npm run build
```

## Architecture Decisions
- **Sync SQLite**: Consistency > performance for single-user local app
- **Background threads**: No Celery needed, daemon threads suffice
- **Jinja2 + htmx**: Zero build step for Web UI
- **AI graceful degradation**: AI failure never blocks bookmark saving
