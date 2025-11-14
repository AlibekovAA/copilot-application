# Python FastAPI - Mistral AI Service

FastAPI микросервис для обработки текстовых запросов с помощью Mistral AI.

## Возможности

- **Интеграция с Mistral AI** - использование языковых моделей для генерации ответов
- **Доменная специализация** - 7 специализированных промптов (legal, marketing, finance, sales, management, hr, general)
- **База данных PostgreSQL** - сохранение всех сообщений с поддержкой истории диалогов
- **Контекстные диалоги** - автоматическая загрузка последних 5 сообщений для контекста
- **Обогащение промпта** - первое сообщение обогащается системным промптом domain
- **Repository Pattern** - чистая архитектура для работы с данными
- **Асинхронная архитектура** - полностью async/await
- **Логирование** - структурированные логи с ротацией
- **Health checks** - автоматический мониторинг состояния
- **Docker ready** - готов к развертыванию в контейнере

## Структура проекта

| Путь                                        | Описание                      |
| ------------------------------------------- | ----------------------------- |
| pyproject.toml                              | Poetry конфигурация           |
| Dockerfile                                  | Docker образ                  |
| python.yml                                  | Docker Compose                |
| app/main.py                                 | Точка входа FastAPI           |
| app/core/config.py                          | Pydantic Settings             |
| app/core/database.py                        | SQLAlchemy async              |
| app/core/events.py                          | Lifecycle hooks               |
| app/api/router.py                           | Главный роутер                |
| app/api/endpoints/chat.py                   | POST /chat endpoint           |
| app/api/endpoints/conversations.py          | GET/POST /conversations       |
| app/api/endpoints/health.py                 | GET /health endpoint          |
| app/schemas/chat.py                         | ChatRequest, ChatResponse     |
| app/schemas/conversation.py                 | Conversation schemas          |
| app/models/base.py                          | Base класс моделей            |
| app/services/mistral_service.py             | Клиент Mistral AI API         |
| app/repositories/message_repository.py      | Repository для сообщений      |
| app/repositories/conversation_repository.py | Repository для диалогов       |
| app/models/conversation.py                  | ORM модель диалога            |
| app/models/message.py                       | ORM модель сообщения          |
| app/middleware/cors.py                      | CORS настройки                |
| app/utils/logger.py                         | Структурированное логирование |
| app/prompts/system_prompts.py               | Системные промпты для доменов |

## Установка и настройка

### Установить зависимости

```bash
make install
# или
poetry install
```

### Добавить зависимость

```bash
poetry add requests
```

### Добавить dev зависимость

```bash
poetry add --group dev pytest
```

### Обновить зависимости

```bash
poetry update
```

## Разработка

### Запустить все проверки (форматирование, линтинг, типы)

```bash
make check
```

### Форматирование кода

```bash
make format
```

### Линтинг с автоисправлением

```bash
make lint
```

### Проверка типов

```bash
make type-check
```

### Запустить сервер локально

```bash
make run
# или
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
