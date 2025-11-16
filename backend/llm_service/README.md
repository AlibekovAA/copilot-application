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
- **JWT аутентификация** - защита endpoints через Bearer токены
- **Dependency Injection** - FastAPI Dependencies для чистой архитектуры

## Архитектура

Проект следует принципам **Clean Architecture** и **SOLID**:

- **Слоистая архитектура**: API → Services → Repositories → Models
- **Dependency Injection**: FastAPI Dependencies для инверсии зависимостей
- **Repository Pattern**: изоляция логики работы с БД
- **Service Layer**: бизнес-логика отделена от endpoints
- **Pydantic Schemas**: валидация и сериализация данных
- **Async/Await**: полностью асинхронная обработка запросов

## Структура проекта

| Путь                                        | Описание                            |
| ------------------------------------------- | ----------------------------------- |
| pyproject.toml                              | Poetry конфигурация                 |
| Dockerfile                                  | Multi-stage Docker образ            |
| python.yml                                  | Docker Compose конфигурация         |
| .dockerignore                               | Исключения для Docker build         |
| Makefile                                    | Команды для разработки              |
| **app/main.py**                             | **Точка входа FastAPI**             |
| **app/core/**                               | **Ядро приложения**                 |
| app/core/config.py                          | Pydantic Settings (env vars)        |
| app/core/database.py                        | SQLAlchemy async engine & session   |
| app/core/events.py                          | Lifecycle hooks (startup/shutdown)  |
| **app/api/**                                | **API слой**                        |
| app/api/router.py                           | Главный API роутер                  |
| app/api/dependencies.py                     | FastAPI Dependencies (DI)           |
| app/api/endpoints/chat.py                   | POST /chat endpoint                 |
| app/api/endpoints/conversations.py          | GET/POST /conversations endpoints   |
| app/api/endpoints/health.py                 | GET /health endpoint                |
| **app/schemas/**                            | **Pydantic схемы**                  |
| app/schemas/chat.py                         | ChatRequest, ChatResponse           |
| app/schemas/conversation.py                 | Conversation schemas                |
| **app/models/**                             | **SQLAlchemy ORM модели**           |
| app/models/base.py                          | Base класс для всех моделей         |
| app/models/conversation.py                  | ORM модель диалога                  |
| app/models/message.py                       | ORM модель сообщения                |
| **app/services/**                           | **Бизнес-логика**                   |
| app/services/mistral_service.py             | Клиент Mistral AI API               |
| app/services/conversation_service.py        | Сервис валидации диалогов           |
| **app/repositories/**                       | **Repository Pattern (Data Layer)** |
| app/repositories/base.py                    | Базовый репозиторий                 |
| app/repositories/message_repository.py      | Repository для сообщений            |
| app/repositories/conversation_repository.py | Repository для диалогов             |
| **app/middleware/**                         | **Middleware слой**                 |
| app/middleware/auth.py                      | JWT аутентификация                  |
| app/middleware/cors.py                      | CORS настройки                      |
| **app/utils/**                              | **Утилиты**                         |
| app/utils/logger.py                         | Структурированное логирование       |
| app/utils/error_handlers.py                 | Централизованная обработка ошибок   |
| **app/prompts/**                            | **Промпты для AI**                  |
| app/prompts/system_prompts.py               | Системные промпты для 7 доменов     |

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
