# Документация сервиса Thule UI

**Версия:** 2.0.0
**Авторы:** Claude Opus 4.6 + Qwen Code 3.5
**Дата:** Март 2026

---

## Содержание

1. [Обзор системы](#1-обзор-системы)
2. [Компоненты системы](#2-компоненты-системы)
3. [Поток данных](#3-поток-данных)
4. [Протокол взаимодействия](#4-протокол-взаимодействия)
5. [Системный промпт](#5-системный-промпт)
6. [Управление сессиями](#6-управление-сессиями)
7. [MCP архитектура](#7-mcp-архитектура)
8. [Безопасность](#8-безопасность)
9. [Хранение данных](#9-хранение-данных)
10. [Обработка ошибок](#10-обработка-ошибок)

---

## 1. Обзор системы

Thule UI — это полнофункциональный веб-интерфейс для работы с AI-ассистентами (Qwen, Claude) через CLI. Система построена на архитектуре клиент-сервер с использованием WebSocket для реального времени.

### Ключевые возможности

- **Мультипровайдерность** — поддержка Qwen и Claude с переключением на уровне сессии
- **Выбор модели** — для Claude: opus/sonnet/haiku
- **Чат-интерфейс** — веб-UI на React с поддержкой множественных сессий
- **Стриминг ответов** — отображение процесса мышления модели в реальном времени
- **MCP инструменты** — выполнение системных команд через Model Context Protocol
- **Подтверждение операций** — UI для подтверждения опасных команд (bash, ssh, файлы)
- **Долгосрочная память** — сохранение фактов между сессиями через SQLite
- **Кастомные промпты** — индивидуальный системный промпт для каждой сессии

---

## 2. Компоненты системы

### 2.1 FastAPI сервер (`server.py`)

**Назначение:** Основной сервер приложения, обрабатывающий HTTP запросы и WebSocket соединения.

**Конфигурация:** Переменные окружения загружаются автоматически из `.env` через `python-dotenv`.

**Основные функции:**

| Функция | Описание |
|---------|----------|
| `init_db()` | Инициализация SQLite базы данных |
| `create_session()` | Создание новой чат-сессии с provider/model |
| `get_sessions()` | Получение списка сессий |
| `get_messages()` | Получение истории сообщений |
| `save_message()` | Сохранение сообщения в БД |
| `build_history()` | Построение контекста для CLI |
| `stream_chat_background()` | Асинхронная обработка запроса к CLI |
| `websocket_endpoint()` | Обработка WebSocket соединений |

**Provider абстракция:**

```python
class CLIProvider(ABC):
    """Базовый класс для провайдеров CLI."""
    
    @abstractmethod
    def get_command(self, session_id: Optional[str], model: Optional[str]) -> List[str]:
        """Возвращает команду для запуска CLI."""
    
    @abstractmethod
    def get_cli_path(self) -> Optional[str]:
        """Возвращает путь к исполняемому файлу CLI."""

class QwenCLIProvider(CLIProvider):
    """Qwen CLI интеграция."""
    def get_command(self, session_id, model):
        return ["qwen", "--input-format", "stream-json", ...]

class ClaudeCLIProvider(CLIProvider):
    """Claude CLI интеграция."""
    def get_command(self, session_id, model):
        return ["claude", "--model", model or "sonnet", ...]
```

**Middleware:**

```python
# Порядок применения (внешний → внутренний):
1. SecurityHeadersMiddleware      # Security headers
2. RequestSizeLimitMiddleware     # Лимит 50MB на запрос
3. CORSMiddleware                 # CORS: allow_origins=["*"]
```

### 2.2 MCP сервер (`mcp_tools_server.py`)

**Назначение:** Сервер инструментов Model Context Protocol для выполнения системных операций.

**Конфигурация:** База данных определяется через `DB_PATH = Path(__file__).parent / "sessions.db"`.

**Инструменты:**

```python
@mcp.tool()
def run_bash_command(command: str) -> str:
    """Выполняет bash команду с таймаутом 120 сек."""

@mcp.tool()
def run_ssh_command(host: str, command: str, user: str = "root") -> str:
    """SSH подключение к удалённому серверу."""

@mcp.tool()
def write_file(path: str, content: str) -> str:
    """Запись содержимого в файл."""

@mcp.tool()
def edit_file(path: str, old_string: str, new_string: str) -> str:
    """Редактирование файла (замена первого вхождения)."""

@mcp.tool()
def read_file(path: str) -> str:
    """Чтение содержимого файла (лимит 2MB)."""

@mcp.tool()
def list_directory(path: str) -> str:
    """Список файлов и директорий."""

@mcp.tool()
def glob(pattern: str, path: str = ".") -> str:
    """Поиск файлов по шаблону."""

@mcp.tool()
def grep_search(pattern: str, path: str = ".", case_sensitive: bool = False) -> str:
    """Поиск по содержимому файлов."""

@mcp.tool()
def web_fetch(url: str) -> str:
    """Загрузка содержимого веб-страницы."""

@mcp.tool()
def web_search(query: str) -> str:
    """Поиск в интернете."""

@mcp.tool()
def todo_write(todos: list) -> str:
    """Управление списком задач."""

@mcp.tool()
def save_memory(key: str, value: str, session_id: str) -> str:
    """Сохранение факта в долгосрочную память."""

@mcp.tool()
def read_memory(session_id: str) -> str:
    """Чтение сохранённых фактов."""
```

### 2.3 Фронтенд (`static/src/`)

**Технологии:**
- React 19.2.3
- TypeScript 5.9.3
- Vite 7.2.4
- Tailwind CSS 4.1.17
- Framer Motion (анимации)
- Highlight.js (подсветка кода)
- Lucide React (иконки)
- Marked (Markdown рендеринг)

**Основные компоненты:**

| Компонент | Назначение |
|-----------|------------|
| `App.tsx` | Главный компонент, управление состоянием |
| `Sidebar.tsx` | Список сессий |
| `ChatHeader.tsx` | Заголовок чата с информацией о сессии |
| `ChatInput.tsx` | Поле ввода сообщения |
| `MessageBubble.tsx` | Отображение сообщений |
| `ConfirmBar.tsx` | Панель подтверждения операций |
| `StatusBar.tsx` | Индикатор состояния WebSocket |
| `SettingsModal.tsx` | Настройки сессии (provider, model, промпт) |
| `EmptyState.tsx` | Заглушка при отсутствии сессии |
| `ThinkingBlock.tsx` | Блок отображения мышления модели |
| `ToolBlock.tsx` | Блок отображения вызовов инструментов |

---

## 3. Поток данных

### 3.1 Обработка запроса пользователя

```
┌──────────┐     ┌───────────┐     ┌────────────┐     ┌──────────┐     ┌─────────┐
│ Браузер  │────▶│ FastAPI   │────▶│ Qwen/Claude│────▶│ MCP      │────▶│ Система │
│ (WebSocket)│   │ (server.py)│   │ CLI        │   │ (tools)  │     │         │
└──────────┘     └───────────┘     └────────────┘     └──────────┘     └─────────┘
     │                │                  │                  │                │
     │ 1. message     │                  │                  │                │
     │───────────────▶│                  │                  │                │
     │                │                  │                  │                │
     │                │ 2. control_request (initialize)     │                │
     │                │─────────────────▶│                  │                │
     │                │                  │                  │                │
     │                │ 3. control_response (success)       │                │
     │                │◀─────────────────│                  │                │
     │                │                  │                  │                │
     │                │ 4. user message   │                  │                │
     │                │─────────────────▶│                  │                │
     │                │                  │                  │                │
     │                │ 5. thinking      │                  │                │
     │                │◀─────────────────│                  │                │
     │ 6. thinking   │                  │                  │                │
     │◀──────────────│                  │                  │                │
     │                │                  │                  │                │
     │                │ 7. tool_use      │                  │                │
     │                │◀─────────────────│                  │                │
     │                │                  │                  │                │
     │                │ 8. control_request (can_use_tool)  │                │
     │                │─────────────────▶│                  │                │
     │                │                  │                  │                │
     │ 9. confirm_request               │                  │                │
     │◀──────────────│                  │                  │                │
     │                │                  │                  │                │
     │ 10. confirm_response (allow)     │                  │                │
     │──────────────▶│                  │                  │                │
     │                │                  │                  │                │
     │                │ 11. control_response (allow)       │                │
     │                │─────────────────▶│                  │                │
     │                │                  │                  │                │
     │                │                  │ 12. tool call    │                │
     │                │                  │─────────────────▶│                │
     │                │                  │                  │                │
     │                │                  │                  │ 13. execute    │
     │                │                  │                  │───────────────▶│
     │                │                  │                  │                │
     │                │                  │ 14. tool_result  │                │
     │                │                  │◀─────────────────│                │
     │                │                  │                  │                │
     │ 15. tool_result│                  │                  │                │
     │◀──────────────│                  │                  │                │
     │                │                  │                  │                │
     │                │ 16. text response│                  │                │
     │                │◀─────────────────│                  │                │
     │ 17. content   │                  │                  │                │
     │◀──────────────│                  │                  │                │
     │                │                  │                  │                │
     │                │ 18. result (done)│                  │                │
     │                │◀─────────────────│                  │                │
     │                │                  │                  │                │
     │ 19. response_end                 │                  │                │
     │◀──────────────│                  │                  │                │
     │                │                  │                  │                │
     │                │ 20. save to DB   │                  │                │
     │                │─────────────────────────────────────▶                │
```

### 3.2 Функция `stream_chat_background()`

**Алгоритм работы:**

1. **Инициализация:**
   - Автосохранение заголовка сессии (первые 50 символов сообщения)
   - Сохранение сообщения пользователя в БД
   - Отправка `response_start` и `stream_start` клиенту

2. **Построение контекста:**
   - Загрузка истории сообщений из БД
   - Получение кастомного системного промпта (если есть)
   - Инъекция сохранённой памяти через `read_memory_for_session()`
   - Полный контекст передаётся без обрезки (управление лимитами — на стороне CLI)

3. **Запуск CLI:**
   ```python
   # Получение провайдера и модели из сессии
   provider = session.get("provider", "qwen")
   model = session.get("model")
   
   # Если есть история и валидный UUID — resume сессии
   if has_history and is_valid_uuid:
       proc = run_cli(resume_id=session_id, provider=provider, model=model)
   elif is_valid_uuid:
       proc = run_cli(session_id=session_id, provider=provider, model=model)
   else:
       proc = run_cli(provider=provider, model=model)  # Без контекста
   ```

4. **Инициализация SDK mode:**
   ```json
   {"type": "control_request", "request_id": "init-001",
    "request": {"subtype": "initialize"}}
   ```

5. **Чтение потока ответов:**
   - Цикл чтения stdout CLI процесса
   - Парсинг JSON строк (SDK format)
   - Обработка типов: `thinking`, `text`, `tool_use`, `tool_result`

6. **Обработка `control_request` (can_use_tool):**
   - Если `connection_state["allow_all"]` — авто-одобрение
   - Иначе — отправка `confirm_request` клиенту
   - Ожидание `confirm_response` через `_wait_for_confirmation()`
   - Отправка `control_response` обратно в CLI

7. **Завершение:**
   - Сохранение сообщений в БД в правильном порядке
   - Отправка `response_end` клиенту

---

## 4. Протокол взаимодействия

### 4.1 WebSocket сообщения

#### Клиент → Сервер

**Отправка сообщения:**
```json
{
  "type": "message",
  "content": "Привет, как дела?"
}
```

**Остановка генерации:**
```json
{
  "type": "stop"
}
```

**Ответ на запрос подтверждения:**
```json
{
  "type": "confirm_response",
  "action": "allow"     // Разрешить эту операцию
}
// или
{
  "type": "confirm_response",
  "action": "deny"      // Запретить
}
// или
{
  "type": "confirm_response",
  "action": "allow_all" // Разрешить все до конца сессии
}
```

#### Сервер → Клиент

| Тип | Поля | Описание |
|-----|------|----------|
| `response_start` | — | Начало обработки запроса |
| `stream_start` | — | Начало стриминга ответа |
| `thinking` | `content: string` | Фрагмент мышления модели |
| `content` | `content: string` | Фрагмент текстового ответа |
| `tool_call` | `name: string`, `args: object` | Вызов инструмента |
| `tool_result` | `name: string`, `content: string` | Результат инструмента |
| `tool_denied` | `name: string` | Инструмент запрещён |
| `confirm_request` | `name: string`, `args: object` | Запрос подтверждения |
| `allow_all_enabled` | — | Режим «разрешить все» активирован |
| `response_end` | — | Завершение ответа |
| `stopped` | — | Остановлено пользователем |
| `error` | `content: string` | Ошибка |
| `session_renamed` | `id: string`, `title: string` | Сессия переименована |
| `ping` | — | Heartbeat (каждые 30 сек) |

### 4.2 CLI SDK protocol

**Формат:** JSON Lines (каждое сообщение на отдельной строке)

**Типы сообщений от CLI:**

```json
// Инициализация
{"type": "control_response", "response": {"subtype": "success", ...}}

// Мышление
{"type": "assistant", "message": {"content": [
  {"type": "thinking", "thinking": "Думаю..."}
]}}

// Текст
{"type": "assistant", "message": {"content": [
  {"type": "text", "text": "Ответ пользователю"}
]}}

// Вызов инструмента
{"type": "assistant", "message": {"content": [
  {"type": "tool_use", "id": "tool_123", "name": "run_bash_command",
   "input": {"command": "ls -la"}}
]}}

// Запрос подтверждения
{"type": "control_request", "request_id": "req_456",
 "request": {"subtype": "can_use_tool", "tool_name": "run_bash_command",
             "input": {"command": "ls -la"}}}

// Результат инструмента
{"type": "user", "message": {"content": [
  {"type": "tool_result", "tool_use_id": "tool_123",
   "content": "total 48\n..."}
]}}

// Завершение
{"type": "result", "result": {"content": [...]}}
```

**Ответы сервера в CLI:**

```json
// Разрешение инструмента
{"type": "control_response", "response": {
  "subtype": "success", "request_id": "req_456",
  "response": {"behavior": "allow"}}}

// Запрет инструмента
{"type": "control_response", "response": {
  "subtype": "success", "request_id": "req_456",
  "response": {"behavior": "deny", "message": "Отклонено"}}}
```

---

## 5. Системный промпт

### 5.1 Структура промпта

Системный промпт определяется в `system_prompt.py` и включает разные версии для Qwen и Claude.

**Qwen промпт:**
- Список всех доступных инструментов
- Принципы работы (ДЕЙСТВУЙ НЕ РАССУЖДАЙ, РАЗБИВАЙ СЛОЖНЫЕ ЗАДАЧИ, etc.)
- Примеры правильного поведения
- Информация о сервисе

**Claude промпт:**
- Список инструментов Claude CLI (Bash, Read, Write, Edit, TodoWrite)
- Важное замечание о TodoWrite (не отправляет сообщения)
- Принципы работы
- Примеры правильного поведения

### 5.2 Инъекция памяти

При построении контекста (`build_history()`) в промпт добавляется блок сохранённых фактов:

```
Сохранённые факты (долгосрочная память):
  • server_ip: 192.168.1.100
  • database_name: myapp_db
  • preferred_editor: vim
```

**Механизм:**
1. Чтение записей из таблицы `memory` через `read_memory_for_session()`
2. Фильтрация ключей с префиксом `_auto_` (автосохранённые темы)
3. Форматирование в виде списка
4. Добавление как `system` сообщение после основного промпта

### 5.3 Кастомный промпт сессии

Пользователь может установить кастомный системный промпт для сессии через Settings Modal.

**Хранение:**
- Поле `system_prompt` в таблице `sessions`
- `NULL` = использование промпта по умолчанию

**Применение:**
```python
custom_prompt = get_session_prompt(sid)
effective_prompt = custom_prompt or get_system_prompt(provider)
```

---

## 6. Управление сессиями

### 6.1 Жизненный цикл сессии

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│ Создание    │────▶│ Активная      │────▶│ Обновление  │────▶│ Удаление    │
│ (POST /api) │     │ (WebSocket)  │     │ (сообщения) │     │ (DELETE)    │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
```

### 6.2 Создание сессии

**API:** `POST /api/sessions`

**Тело запроса:**
```json
{"title": "Мой новый чат", "provider": "qwen", "model": null}
```

**Ответ:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Мой новый чат",
  "created_at": "2026-03-01T12:00:00",
  "updated_at": "2026-03-01T12:00:00",
  "provider": "qwen",
  "model": null
}
```

**Процесс:**
1. Генерация UUID v4
2. Запись в таблицу `sessions` с provider/model
3. Возврат данных клиенту

### 6.3 Автоматическое переименование

При первом сообщении пользователя сессия автоматически переименовывается:

```python
def auto_title(session_id: str, user_msg: str):
    title = user_msg[:50].strip()
    if len(user_msg) > 50:
        title += "..."
    # Обновление в БД только если это первое сообщение
```

### 6.4 Контекст

**Функция `build_history()`:**

1. **Базовый контекст:**
   - Системный промпт (по провайдеру)
   - Инъекция памяти
   - История сообщений (user/assistant/tool)

2. **Без искусственных ограничений:**
   Полный контекст передаётся в CLI. Управление лимитами контекста и результатов инструментов — на стороне CLI.

---

## 7. MCP архитектура

### 7.1 MCPSessionManager

**Назначение:** Управление единственной MCP сессией (не привязана к session_id чата).

**Состояния:**
```python
class MCPSessionManager:
    _session: ClientSession       # Активная сессия
    _cm_stdio: stdio_client       # Контекст stdio
    _cm_client: ClientSession     # Контекст клиента
    _connected: bool              # Флаг подключения
    _lock: asyncio.Lock           # Блокировка для потокобезопасности
```

**Методы:**

| Метод | Описание |
|-------|----------|
| `_create_session()` | Создание новой MCP сессии |
| `_close_internal()` | Закрытие ресурсов |
| `_ensure_session()` | Гарантия живой сессии |
| `call_tool()` | Вызов инструмента |
| `list_tools()` | Список доступных инструментов |

### 7.2 Протокол MCP

**Транспорт:** Stdio (stdin/stdout)

**Инициализация:**
```python
params = StdioServerParameters(
    command=MCP_PYTHON,
    args=[MCP_SERVER_SCRIPT],
    cwd=str(Path(__file__).parent),
    env={**os.environ},
)
```

**Поток:**
```
┌──────────────┐     ┌──────────────┐
│ server.py    │     │ mcp_tools_   │
│ (MCPSession) │     │ server.py    │
└──────────────┘     └──────────────┘
       │                    │
       │ 1. initialize      │
       │───────────────────▶│
       │                    │
       │ 2. initialized     │
       │◀───────────────────│
       │                    │
       │ 3. list_tools      │
       │───────────────────▶│
       │                    │
       │ 4. tools list      │
       │◀───────────────────│
       │                    │
       │ 5. call_tool       │
       │───────────────────▶│
       │                    │
       │ 6. tool result     │
       │◀───────────────────│
```

### 7.3 Инструменты и подтверждение

**Список инструментов требующих подтверждения:**

```python
TOOLS_REQUIRING_CONFIRMATION = {
    # Bash/Shell инструменты
    "Bash", "bash", "run_bash_command", "execute_command",
    "run_command", "shell", "run_shell_command",
    # SSH инструменты
    "ssh", "SSH", "run_ssh_command", "remote_command",
    # Файловые инструменты (опасные)
    "Write", "write_file", "create_file", "WriteFile",
    "Edit", "edit_file", "replace_in_file", "EditFile",
    "delete_file", "remove_file", "rm_file",
    # Операционные системы
    "system_reboot", "system_shutdown", "reboot", "shutdown",
}
```

**Механизм подтверждения:**

1. CLI отправляет `control_request` (can_use_tool)
2. Сервер проверяет название инструмента
3. Если требует подтверждения:
   - Отправка `confirm_request` клиенту
   - Ожидание через `_wait_for_confirmation()`
   - Отправка `control_response` в CLI
4. Если `allow_all` — авто-одобрение

---

## 8. Безопасность

### 8.1 Security headers

```python
HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"x-xss-protection", b"1; mode=block"),
    (b"referrer-policy", b"strict-origin-when-cross-origin"),
]
```

### 8.2 CORS

Сервер доступен с любого адреса:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 8.3 Лимиты

| Лимит | Значение |
|-------|----------|
| `MAX_REQUEST_SIZE` | 50 MB |
| Таймаут bash/ssh | 120 секунд |
| Таймаут подтверждения | 300 секунд |
| Лимит чтения файла (MCP) | 2 MB |

---

## 9. Хранение данных

### 9.1 SQLite схема

**Таблица `sessions`:**
```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,           -- UUID
    user_id TEXT,                  -- зарезервировано
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    system_prompt TEXT DEFAULT NULL,
    provider TEXT DEFAULT 'qwen',  -- qwen/claude
    model TEXT DEFAULT NULL        -- opus/sonnet/haiku
);
```

**Таблица `messages`:**
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,            -- user/assistant/assistant_tool_call/tool
    content TEXT NOT NULL,
    thinking TEXT,
    tool_calls TEXT,               -- JSON
    tool_name TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_session_id ON messages(session_id);
```

**Таблица `memory`:**
```sql
CREATE TABLE memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(session_id, key)
);

CREATE INDEX idx_memory_session_id ON memory(session_id);
```

### 9.2 Порядок сохранения сообщений

**Для сообщений с инструментами:**

```
1. assistant_tool_call (содержит tool_calls JSON)
   ├─ role: "assistant_tool_call"
   ├─ content: "Текст ответа (если есть)"
   ├─ thinking: "Содержимое thinking"
   └─ tool_calls: [{"function": {"name": "...", "arguments": {...}}}]

2. tool × N (по одному на каждый вызов)
   ├─ role: "tool"
   ├─ content: "Результат выполнения"
   └─ tool_name: "название_инструмента"
```

**Для обычных сообщений:**

```
assistant
├─ role: "assistant"
├─ content: "Текст ответа"
└─ thinking: "Содержимое thinking"
```

### 9.3 Долгосрочная память

**Автосохранение тем:**

При каждом сообщении пользователя сохраняется тема для контекста:

```python
def _auto_save_digest(session_id: str, last_user_msg: str):
    DIGEST_KEY = "_auto_conversation_topics"
    MAX_TOPICS = 20
    # Добавление темы в список (обрезка до 20)
```

**Ручное сохранение:**

Через инструмент `save_memory`:

```python
@mcp.tool()
def save_memory(key: str, value: str, session_id: str) -> str:
    """Сохраняет факт в долгосрочную память сессии."""
```

---

## 10. Обработка ошибок

### 10.1 Типы ошибок

| Тип | Обработка |
|-----|-----------|
| WebSocket disconnect | Логирование, очистка ресурсов |
| CLI process crash | Fallback на новый запуск |
| MCP session error | Пересоздание сессии |
| Database error | Логирование, возврат ошибки клиенту |
| Timeout | Отправка `error` сообщения |

### 10.2 Механизм восстановления

**При ошибке CLI процесса:**

```python
# Fallback: если процесс умер
if init_resp is None and proc.poll() is not None:
    logger.warning(f"CLI процесс завершился, пробуем без --resume")
    proc = run_cli(session_id=session_id, provider=provider, model=model)
    proc.stdin.write(init_msg + "\n")
    proc.stdin.flush()
    await _wait_for_init_response(proc)
```

**При ошибке MCP:**

```python
except Exception:
    # Реальная ошибка MCP — пересоздадим сессию при следующем вызове
    self._connected = False
    self._session = None
    raise
```

### 10.3 Логирование

**Файл логов:** `server.log`

**Формат:**
```
%(asctime)s - %(name)s - %(levelname)s - %(message)s
```

**Уровни:**
- `INFO` — штатные события (подключения, запросы)
- `WARNING` — предупреждения (fallback режимы)
- `ERROR` — ошибки с traceback

---

## Приложения

### A. Переменные окружения (полный список)

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `QWEN_PATH` | Путь к qwen CLI | автоопределение |
| `CLAUDE_PATH` | Путь к claude CLI | автоопределение |
| `MCP_PYTHON` | Python для MCP | `sys.executable` |

### B. Порты

| Сервис | Порт |
|--------|------|
| FastAPI | 10310 |
| Vite dev server | 5173 (не используется в продакшне) |

### C. Файлы

| Файл | Назначение |
|------|------------|
| `server.py` | Основной сервер |
| `mcp_tools_server.py` | MCP инструменты |
| `system_prompt.py` | Системные промпты |
| `sessions.db` | SQLite база |
| `server.log` | Логи |
| `static/dist/` | Сборка фронтенда |
| `.env` | Переменные окружения |
| `mcp_config.json` | MCP конфиг для IDE |

---

**Конец документа**
