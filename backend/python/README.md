backend/python/
├── pyproject.toml
├── README.md
├── Dockerfile
├── python.yml
│
└── app/
├── **init**.py
├── main.py
├── consumer.py
│
├── core/
│ ├── **init**.py
│ ├── config.py
│ ├── database.py
│ └── events.py
│
├── api/
│ ├── **init**.py
│ ├── router.py
│ └── endpoints/
│ ├── **init**.py
│ ├── chat.py
│ └── health.py
│
├── schemas/
│ ├── **init**.py
│ ├── chat.py
│ └── task.py
│
├── models/
│ ├── **init**.py
│ ├── base.py
│ └── task.py
│
├── services/
│ ├── **init**.py
│ ├── qwen_service.py
│ ├── minio_service.py
│ └── task_service.py
│
├── consumers/
│ ├── **init**.py
│ └── task_consumer.py
│
├── middleware/
│ ├── **init**.py
│ └── cors.py
│
└── utils/
├── **init**.py
├── exceptions.py
└── logger.py

| Путь                           | Описание                  |
| ------------------------------ | ------------------------- |
| pyproject.toml                 | Poetry конфигурация       |
| Dockerfile                     | Docker образ              |
| python.yml                     | Docker Compose            |
| app/main.py                    | Точка входа FastAPI       |
| app/consumer.py                | RabbitMQ consumer         |
| app/core/config.py             | Pydantic Settings         |
| app/core/database.py           | SQLAlchemy async          |
| app/core/events.py             | Lifecycle hooks           |
| app/api/router.py              | Главный роутер            |
| app/api/endpoints/chat.py      | POST /api/chat            |
| app/api/endpoints/health.py    | GET /health               |
| app/schemas/chat.py            | ChatRequest, ChatResponse |
| app/schemas/task.py            | TaskMessage, TaskStatus   |
| app/models/base.py             | Base класс моделей        |
| app/models/task.py             | Task ORM модель           |
| app/services/qwen_service.py   | Клиент Qwen API           |
| app/services/minio_service.py  | Работа с MinIO            |
| app/services/task_service.py   | CRUD задач                |
| app/consumers/task_consumer.py | Consumer с aio-pika       |
| app/middleware/cors.py         | CORS настройки            |
| app/utils/exceptions.py        | Кастомные исключения      |
| app/utils/logger.py            | Structlog логирование     |

# Установить все зависимости

poetry install

# Только production зависимости (без dev)

poetry install --only main

# Добавить новую зависимость

poetry add requests

# Добавить dev зависимость

poetry add --group dev black

# Обновить зависимости

poetry update

# Проверить код

poetry run ruff check app/

# Автоматически исправить

poetry run ruff check app/ --fix

# Форматирование

poetry run ruff format app/

# Проверить только определенные правила

poetry run ruff check app/ --select=E,F,I

# Проверка типов

poetry run mypy app/

# Более строгая проверка

poetry run mypy app/ --strict

# Игнорировать определенные файлы

poetry run mypy app/ --exclude 'alembic/'
