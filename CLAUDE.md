# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thule UI is a web interface for AI CLI tools (qwen-cli and claude CLI) with MCP (Model Context Protocol) tool support. It provides a chat interface where users can interact with AI assistants, which can execute system commands, manipulate files, and perform web operations through a confirmation-based security model.

**Tech Stack:**
- Backend: FastAPI + WebSocket + SQLite
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS
- AI Integration: qwen-cli and claude CLI (SDK mode with stream-json format)
- Tools: MCP server (stdio transport)

**Key Features:**
- Provider switching: Choose between Qwen and Claude per session
- Model selection: For Claude, select opus/sonnet/haiku
- Unified tool confirmation flow for both providers
- Session persistence with provider/model settings
- Custom system prompts per session
- Long-term memory via SQLite

## Development Commands

### Backend

```bash
# Start development server (auto-reload)
python server.py

# Or with uvicorn directly
uvicorn server:app --host 0.0.0.0 --port 10310 --reload

# Production
uvicorn server:app --host 0.0.0.0 --port 10310
```

### Frontend

```bash
cd static

# Install dependencies
npm install

# Development server (port 5173)
npm run dev

# Build for production (outputs to static/dist/)
npm run build

# Preview production build
npm run preview
```

### Database

The SQLite database (`sessions.db`) is created automatically on first run with migrations applied. No manual initialization needed.

## Architecture

### Multi-Process Communication Flow

```
Browser (WebSocket) ↔ FastAPI (server.py) ↔ Qwen/Claude CLI (SDK mode) ↔ MCP Server (mcp_tools_server.py)
                            ↓
                      SQLite (sessions.db)
```

**Key architectural points:**

1. **FastAPI Server** (`server.py`):
   - Manages WebSocket connections per chat session
   - Spawns CLI processes in SDK mode (`--input-format stream-json --output-format stream-json`)
   - Handles session resume via `--resume <session_id>` flag
   - Implements confirmation flow for dangerous operations
   - Provider abstraction (QwenCLIProvider, ClaudeCLIProvider)
   - Stores messages and memory in SQLite

2. **CLI Integration**:
   - Runs as subprocess, communicates via JSON Lines protocol
   - SDK protocol: `control_request`/`control_response` for tool confirmation
   - Streams thinking, text, and tool calls in real-time
   - Session persistence through `--resume` flag
   - Provider-specific flags (`--approval-mode` for Qwen, `--permission-mode` for Claude)

3. **MCP Server** (`mcp_tools_server.py`):
   - Standalone process, stdio transport
   - Provides tools: `run_bash_command`, `run_ssh_command`, `write_file`, `edit_file`, `read_file`, `list_directory`, `glob`, `grep_search`, `web_fetch`, `web_search`, `todo_write`, `todo_read`, `save_memory`, `read_memory`
   - All tools require user confirmation before execution (bash/ssh/file write/edit)
   - 120-second timeout on bash/ssh commands

4. **Confirmation Flow**:
   - CLI sends `control_request` (subtype: `can_use_tool`)
   - Server checks if tool is in `TOOLS_REQUIRING_CONFIRMATION`
   - If yes: sends `confirm_request` to browser, waits for user response
   - User can: `allow` (once), `deny`, or `allow_all` (session-wide)
   - Server sends `control_response` back to CLI with decision

### Key Files

- `server.py` - Main fastAPI application, WebSocket handler, CLI orchestration with provider abstraction
- `mcp_tools_server.py` - MCP tool server (bash, ssh, file operations, web, memory)
- `system_prompt.py` - System prompts for Qwen and Claude providers
- `static/src/App.tsx` - Main React component, state management
- `static/src/api.ts` - REST API client for sessions/messages
- `static/src/components/SettingsModal.tsx` - Session settings UI with provider/model/prompt
- `sessions.db` - SQLite database (tables: sessions, messages, memory)

### Provider Abstraction

The codebase uses a provider abstraction pattern to support multiple AI CLI tools:

**CLIProvider base class** (`server.py`):
- `get_command(session_id, model)` - Returns command array for subprocess
- `get_cli_path()` - Returns path to CLI executable
- `validate_model(model)` - Validates model name
- `get_provider_name()` - Returns provider name for logging

**QwenCLIProvider** - Qwen CLI integration
- Uses `--approval-mode default`
- No model parameter (uses default)

**ClaudeCLIProvider** - Claude CLI integration
- Uses `--permission-mode default`
- Requires `--model` flag (opus/sonnet/haiku)

Both providers use identical JSON Lines protocol for communication.

### Database Schema

**sessions**: `id` (UUID), `user_id`, `title`, `created_at`, `updated_at`, `system_prompt` (nullable), `provider` (qwen/claude, default: qwen), `model` (opus/sonnet/haiku, nullable)

**messages**: `session_id`, `role` (user/assistant/assistant_tool_call/tool), `content`, `thinking`, `tool_calls` (JSON), `tool_name`

**memory**: `session_id`, `key`, `value` - Long-term memory storage across sessions

**Migration**: Existing sessions automatically default to `provider='qwen'`, `model=NULL`

## Important Patterns

### SDK Protocol (server.py ↔ CLI)

Messages are JSON Lines format. Key message types:

**From CLI:**
- `{"type": "assistant", "message": {"content": [{"type": "thinking", "thinking": "..."}]}}`
- `{"type": "assistant", "message": {"content": [{"type": "text", "text": "..."}]}}`
- `{"type": "assistant", "message": {"content": [{"type": "tool_use", "id": "...", "name": "...", "input": {...}}]}}`
- `{"type": "control_request", "request_id": "...", "request": {"subtype": "can_use_tool", ...}}`

**To CLI:**
- `{"type": "control_request", "request_id": "...", "request": {"subtype": "initialize"}}`
- `{"type": "control_response", "response": {"subtype": "success", "request_id": "...", "response": {"behavior": "allow|deny"}}}`

### Session Resume Logic

```python
# If session has history and valid UUID → resume
if has_history and is_valid_uuid:
    proc = run_cli(resume_id=session_id, provider=provider, model=model)
# If valid UUID but no history → new session with ID
elif is_valid_uuid:
    proc = run_cli(session_id=session_id, provider=provider, model=model)
# Otherwise → anonymous session
else:
    proc = run_cli(provider=provider, model=model)
```

### Memory Injection

When building context for CLI, the server:
1. Reads saved facts from `memory` table via `read_memory_for_session()`
2. Filters out auto-saved keys (prefix `_auto_`)
3. Injects as system message: "Сохранённые факты (долгосрочная память): • key: value"
4. This happens before sending user message to CLI

## Configuration

### Environment Variables (.env)

- `QWEN_PATH` - Path to qwen CLI executable (default: auto-detect)
- `CLAUDE_PATH` - Path to claude CLI executable (default: auto-detect)
- `MCP_PYTHON` - Python interpreter for MCP server (defaults to `sys.executable`)

### Ports

- FastAPI: 10310
- Vite dev server: 5173 (development only)

### Provider Selection

Users can select provider and model in the Settings Modal:
1. Open session settings (gear icon)
2. Select provider: Qwen or Claude
3. If Claude: select model (opus/sonnet/haiku)
4. Optionally set custom system prompt
5. Save settings

Settings are stored per-session in the database.

## Testing Notes

- No automated tests currently exist
- Manual testing via browser at `http://localhost:10310`
- Check `server.log` for backend errors
- Browser console for frontend errors
- MCP tools can be tested by asking the agent to run commands

## Common Issues

1. **CLI not found**: Set `QWEN_PATH` or `CLAUDE_PATH` in `.env`
2. **MCP server fails**: Check Python path in `MCP_PYTHON`, ensure `mcp_tools_server.py` is executable
3. **Session resume fails**: Server falls back to new session without `--resume` flag
4. **Frontend not loading**: Run `npm run build` in `static/` directory first
5. **Provider switch doesn't work**: Ensure CLI is installed and path is correct in `.env`

## Code Style

- Backend: Python 3.10+, type hints where practical, docstrings for public functions
- Frontend: TypeScript with strict mode, functional React components, hooks for state
- Naming: snake_case for Python, camelCase for TypeScript
- Imports: Grouped by type (stdlib, third-party, local), sorted alphabetically
