# Thule UI

![Описание картинки](https://lh3.googleusercontent.com/d/1L6Ya-BCRb8AdSndyjB2mLf0GiPzCwwVK)
**Веб-интерфейс для AI CLI с поддержкой MCP инструментов и множественных провайдеров**

---

## Авторы

**Claude Opus 4.6 + Qwen Code 3.5**

---

## Оглавление

1. [Описание](#описание)
2. [Архитектура](#архитектура)
3. [Требования](#требования)
4. [Установка](#установка)
5. [Конфигурация](#конфигурация)
6. [Запуск](#запуск)
7. [Переменные окружения](#переменные-окружения)
8. [API](#api)
9. [MCP инструменты](#mcp-инструменты)
10. [Структура проекта](#структура-проекта)

---

## Описание

Thule UI — это веб-приложение на базе FastAPI, предоставляющее интерфейс для работы с AI-ассистентами (Qwen, Claude) через CLI. Приложение поддерживает:

- **Множественные провайдеры** — переключение между Qwen и Claude для каждой сессии
- **Выбор модели** — для Claude: opus/sonnet/haiku
- **Множественные сессии чатов** с сохранением истории в SQLite
- **MCP (Model Context Protocol) инструменты** для выполнения системных команд
- **Подтверждение опасных операций** (bash, ssh, запись файлов) перед выполнением
- **Стриминг ответов** с отображением процесса мышления модели
- **Долгосрочную память** через save_memory/read_memory инструменты
- **Кастомные системные промпты** для каждой сессии

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                        Браузер (Клиент)                         │
│  React 19 + TypeScript + Vite + Tailwind CSS                    │
│  WebSocket для стриминга ответов                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket (порт 10310)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Server (server.py)                   │
│  • Управление сессиями (SQLite)                                 │
│  • WebSocket handler                                            │
│  • MCP Session Manager                                          │
│  • Provider abstraction (Qwen/Claude)                           │
│  • CORS: allow_origins=["*"]                                    │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    │                           │
                    ▼                           ▼
┌───────────────────────────┐   ┌─────────────────────────────────┐
│  Qwen CLI / Claude CLI    │   │   MCP Server (mcp_tools_server) │
│  --input-format stream-json│  │  Stdio transport                │
│  --output-format stream-json│ │  Инструменты:                   │
│  --approval-mode default   │  │  • run_bash_command             │
│  --model <model> (Claude)  │  │  • run_ssh_command              │
│  --resume <session_id>     │  │  • write_file                   │
└───────────────────────────┘   │  • edit_file                    │
                                │  • read_file                    │
                                │  • list_directory               │
                                │  • glob                         │
                                │  • grep_search                  │
                                │  • web_fetch                    │
                                │  • web_search                   │
                                │  • todo_write                   │
                                │  • todo_read                    │
                                │  • save_memory                  │
                                │  • read_memory                  │
                                └─────────────────────────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │   SQLite (sessions.db)  │
                              │   • sessions            │
                              │   • messages            │
                              │   • memory              │
                              └─────────────────────────┘
```

---

## Требования

### Системные требования

- **ОС:** Linux (протестировано на Arch Linux)
- **Python:** 3.10+ (рекомендуется 3.14)
- **Node.js:** 18+ (для сборки фронтенда)
- **qwen CLI:** установлен и доступен
- **claude CLI:** опционально, для поддержки Claude

### Python зависимости

```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
websockets>=12.0
mcp>=1.0.0
authlib>=1.3.0
httpx>=0.26.0
itsdangerous>=2.1.2
jinja2>=3.1.3
beautifulsoup4>=4.12.0
requests>=2.31.0
python-dotenv>=1.0.0
```

### Node.js зависимости (фронтенд)

См. `static/package.json`

---

## Установка

### 1. Клонирование репозитория

```bash
git clone git@github.com:Nezhirn/thule_ui.git
cd thule_ui
```

### 2. Установка Python зависимостей

```bash
pip install -r requirements.txt
```

### 3. Установка Node.js зависимостей (для сборки фронтенда)

```bash
cd static
npm install
npm run build
cd ..
```

### 4. Проверка CLI

Убедитесь, что CLI установлены и доступны:

```bash
qwen --version
claude --version  # опционально
```

Если используются кастомные пути, настройте переменные в `.env`.

---

## Конфигурация

### Файл `.env`

Создайте файл `.env` в корне проекта. Переменные загружаются автоматически через `python-dotenv`:

```bash
# Путь к Python для MCP (по умолчанию используется sys.executable)
export MCP_PYTHON="/path/to/python"

# Путь к qwen CLI
export QWEN_PATH="/path/to/qwen"

# Путь к claude CLI (опционально)
export CLAUDE_PATH="/path/to/claude"
```

---

## Запуск

### Разработка (с auto-reload)

```bash
python server.py
```

Или через uvicorn напрямую:

```bash
uvicorn server:app --host 0.0.0.0 --port 10310 --reload
```

### Продакшн

```bash
uvicorn server:app --host 0.0.0.0 --port 10310
```

### Доступ к приложению

Откройте в браузере: `http://localhost:10310`

Сервер доступен с любого адреса (CORS: `allow_origins=["*"]`).

---

## Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `QWEN_PATH` | Путь к исполняемому файлу qwen CLI | автоопределение |
| `CLAUDE_PATH` | Путь к исполняемому файлу claude CLI | автоопределение |
| `MCP_PYTHON` | Путь к Python для MCP | `sys.executable` (текущий Python) |

Контекст и лимиты результатов инструментов управляются CLI.

---

## API

### REST API

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| `GET` | `/` | Главная страница (React SPA) |
| `GET` | `/api/health` | Health-check |
| `GET` | `/api/user` | Текущий пользователь |
| `GET` | `/api/sessions` | Список сессий |
| `POST` | `/api/sessions` | Создать сессию |
| `DELETE` | `/api/sessions/{id}` | Удалить сессию |
| `PUT` | `/api/sessions/{id}` | Переименовать сессию |
| `PATCH` | `/api/sessions/{id}/settings` | Обновить настройки (provider/model) |
| `GET` | `/api/sessions/{id}/messages` | Сообщения сессии (с пагинацией) |
| `GET` | `/api/sessions/{id}/system-prompt` | Системный промпт сессии |
| `PUT` | `/api/sessions/{id}/system-prompt` | Установить системный промпт |
| `GET` | `/api/default-prompt` | Системный промпт по умолчанию |
| `GET` | `/api/sessions/{id}/export` | Экспорт сессии в Markdown |

### WebSocket

**Подключение:** `ws://localhost:10310/ws/{session_id}`

**Сообщения клиент → сервер:**

```json
{"type": "message", "content": "Текст сообщения"}
{"type": "stop"}
{"type": "confirm_response", "action": "allow|deny|allow_all"}
```

**Сообщения сервер → клиент:**

| Тип | Описание |
|-----|----------|
| `response_start` | Начало обработки |
| `stream_start` | Начало стриминга |
| `thinking` | Фрагмент мышления |
| `content` | Фрагмент ответа |
| `tool_call` | Вызов инструмента |
| `tool_result` | Результат инструмента |
| `tool_denied` | Инструмент запрещён |
| `confirm_request` | Запрос подтверждения |
| `allow_all_enabled` | Разрешены все инструменты |
| `response_end` | Конец ответа |
| `stopped` | Остановлено пользователем |
| `error` | Ошибка |
| `session_renamed` | Сессия переименована |
| `ping` | Heartbeat |

---

## MCP инструменты

### Встроенные инструменты

| Инструмент | Описание | Требует подтверждения |
|------------|----------|----------------------|
| `run_bash_command` | Выполнение bash команды | ✅ |
| `run_ssh_command` | SSH команда на удалённом сервере | ✅ |
| `write_file` | Запись в файл | ✅ |
| `edit_file` | Редактирование файла | ✅ |
| `read_file` | Чтение файла | ❌ |
| `list_directory` | Список файлов в директории | ❌ |
| `glob` | Поиск файлов по шаблону | ❌ |
| `grep_search` | Поиск по содержимому файлов | ❌ |
| `web_fetch` | Загрузка веб-страницы | ❌ |
| `web_search` | Поиск в интернете | ❌ |
| `todo_write` | Управление задачами | ❌ |
| `todo_read` | Чтение списка задач | ❌ |
| `save_memory` | Сохранение в долгосрочную память | ❌ |
| `read_memory` | Чтение памяти | ❌ |

### Инструменты Qwen CLI (нативные)

- `run_shell_command` — bash команды
- `read_file` — чтение файлов
- `write_file` — запись файлов
- `edit_file` — редактирование файлов
- `list_directory` — список файлов
- `glob` — поиск файлов
- `grep_search` — поиск по содержимому
- `web_fetch` — загрузка веб-страниц
- `web_search` — поиск в интернете
- `todo_write` / `todo_read` — управление задачами
- `save_memory` / `read_memory` — долгосрочная память

### Инструменты Claude CLI (нативные)

- `Bash` — bash команды
- `Read` — чтение файлов
- `Write` — запись файлов
- `Edit` — редактирование файлов
- `TodoWrite` — управление задачами

---

## Структура проекта

```
thule_ui/
├── server.py              # Основной FastAPI сервер
├── mcp_tools_server.py    # MCP сервер с инструментами
├── system_prompt.py       # Системные промпты (Qwen/Claude)
├── requirements.txt       # Python зависимости
├── .env                   # Переменные окружения
├── sessions.db            # SQLite база данных
├── server.log             # Лог файл
├── mcp_config.json        # Конфигурация MCP для IDE
├── static/                # Фронтенд
│   ├── package.json       # Node.js зависимости
│   ├── tsconfig.json      # TypeScript конфиг
│   ├── vite.config.ts     # Vite конфиг
│   ├── index.html         # HTML шаблон
│   ├── dist/              # Сборка для продакшна
│   └── src/
│       ├── main.tsx       # Точка входа React
│       ├── App.tsx        # Главный компонент
│       ├── api.ts         # API клиент
│       ├── types.ts       # TypeScript типы
│       ├── index.css      # Стили
│       ├── components/    # React компоненты
│       │   ├── Sidebar.tsx
│       │   ├── ChatHeader.tsx
│       │   ├── ChatInput.tsx
│       │   ├── MessageBubble.tsx
│       │   ├── ConfirmBar.tsx
│       │   ├── StatusBar.tsx
│       │   ├── SettingsModal.tsx
│       │   ├── EmptyState.tsx
│       │   ├── ThinkingBlock.tsx
│       │   └── ToolBlock.tsx
│       └── utils/         # Утилиты
├── DOCUMENTATION.md       # Полная документация
├── CLAUDE.md              # Гид для разработчиков
└── README.md              # Этот файл
```

---

## База данных

### Таблицы

**sessions**
- `id` (TEXT, PRIMARY KEY) — UUID сессии
- `user_id` (TEXT) — зарезервировано
- `title` (TEXT) — Заголовок чата
- `created_at` (TEXT) — Дата создания
- `updated_at` (TEXT) — Дата обновления
- `system_prompt` (TEXT) — Кастомный системный промпт
- `provider` (TEXT) — Провайдер: qwen/claude
- `model` (TEXT) — Модель: opus/sonnet/haiku (для Claude)

**messages**
- `id` (INTEGER, PRIMARY KEY)
- `session_id` (TEXT, FK)
- `role` (TEXT) — user/assistant/assistant_tool_call/tool
- `content` (TEXT)
- `thinking` (TEXT) — Содержимое thinking
- `tool_calls` (TEXT, JSON) — Вызовы инструментов
- `tool_name` (TEXT) — Название инструмента
- `created_at` (TEXT)

**memory**
- `id` (INTEGER, PRIMARY KEY)
- `session_id` (TEXT, FK)
- `key` (TEXT)
- `value` (TEXT)
- `created_at` (TEXT)

---

## Безопасность

### Middleware

1. **RequestSizeLimitMiddleware** — ограничение размера запроса (50 MB)
2. **SecurityHeadersMiddleware** — security headers:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`

### Подтверждение операций

Инструменты требующие подтверждения:
- `bash`, `shell`, `run_bash_command`, `execute_command`
- `ssh`, `run_ssh_command`, `remote_command`
- `write_file`, `create_file`, `WriteFile`
- `edit_file`, `replace_in_file`, `EditFile`
- `delete_file`, `remove_file`
- `system_reboot`, `system_shutdown`

---

## Лицензия

MIT
