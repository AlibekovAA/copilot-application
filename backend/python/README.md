| Путь                           | Описание                  |
| ------------------------------ | ------------------------- |
| pyproject.toml                 | Poetry конфигурация       |
| Dockerfile                     | Docker образ              |
| python.yml                     | Docker Compose            |
| app/main.py                    | Точка входа FastAPI       |
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
| app/utils/logger.py            | Structlog логирование     |

## Установка и настройка

### Установить зависимости

```
make install
```

### Добавить зависимость

```
poetry add requests
```

### Добавить dev зависимость

```
poetry add --group dev pytest
```

### Обновить зависимости

```
poetry update
```

## Разработка

### Запустить все проверки (форматирование, линтинг, типы)

```
make check
```

### Форматирование кода

```
make format
```

### Линтинг с автоисправлением

```
make lint
```

### Проверка типов

```
make type-check
```
