# Python FastAPI - Mistral AI Service

FastAPI микросервис для обработки текстовых запросов с помощью Mistral AI.

## Возможности

- **Интеграция с Mistral AI** - использование языковых моделей для генерации ответов
- **Загрузка и парсинг файлов** - поддержка PDF, DOCX, TXT, MD с автоматическим извлечением текста
- **Доменная специализация** - 7 специализированных промптов (legal, marketing, finance, sales, management, hr, general)
- **База данных PostgreSQL** - сохранение всех сообщений с поддержкой истории диалогов
- **Контекстные диалоги** - автоматическая загрузка последних 3-х пар сообщений для контекста
- **Обогащение промпта** - первое сообщение обогащается системным промптом domain
- **CRUD операции** - полный набор операций для управления диалогами (создание, чтение, удаление)
- **Каскадное удаление** - автоматическое удаление связанных сообщений при удалении диалога
- **Упрощенная обработка файлов** - файлы парсятся и текст добавляется к сообщению (не сохраняются на диск)
- **Repository Pattern** - чистая архитектура для работы с данными
- **Асинхронная архитектура** - полностью async/await
- **Логирование** - структурированные логи с ротацией
- **Health checks** - автоматический мониторинг состояния
- **Docker ready** - готов к развертыванию в контейнере
- **JWT аутентификация** - защита endpoints через Bearer токены
- **Dependency Injection** - FastAPI Dependencies для чистой архитектуры

## API Endpoints

### Чат

- **POST /chat** - отправка сообщения в чат с поддержкой файлов

### Диалоги (Conversations)

- **POST /conversations** - создание нового диалога
- **GET /conversations** - получение списка диалогов пользователя (с пагинацией)
- **GET /conversations/{conversation_id}/messages** - получение всех сообщений диалога
- **DELETE /conversations/{conversation_id}** - удаление диалога (каскадное удаление сообщений)

### Здоровье

- **GET /health** - проверка состояния сервиса

## Обработка файлов

Система использует **упрощенный подход** к обработке файлов:

1. **Загрузка** - пользователь прикрепляет файл к сообщению
2. **Валидация** - проверка формата и размера файла
3. **Парсинг** - извлечение текста из файла (PDF, DOCX, TXT, MD)
4. **Добавление к сообщению** - извлеченный текст добавляется к тексту сообщения
5. **Отправка в AI** - сообщение с текстом файла отправляется в Mistral AI
6. **Удаление** - файл НЕ сохраняется (ни на диск, ни в БД)

**Преимущества:**

- ✅ Простая архитектура (нет отдельной таблицы для файлов)
- ✅ Меньше места на диске
- ✅ Быстрая обработка (нет I/O операций)
- ✅ Легче поддержка

## Архитектура

Проект следует принципам **Clean Architecture** и **SOLID**:

- **Слоистая архитектура**: API → Services → Repositories → Models
- **Dependency Injection**: FastAPI Dependencies для инверсии зависимостей
- **Repository Pattern**: изоляция логики работы с БД
- **Service Layer**: бизнес-логика отделена от endpoints
- **Pydantic Schemas**: валидация и сериализация данных
- **Async/Await**: полностью асинхронная обработка запросов
- **Cascade Delete**: автоматическое удаление связанных сообщений при удалении диалога
- **Упрощенная обработка файлов**: файлы парсятся on-the-fly, текст добавляется к сообщению

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
| app/api/endpoints/conversations.py          | Conversations CRUD endpoints        |
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
| app/services/file_service.py                | Валидация и парсинг файлов          |
| app/services/file_processing_service.py     | Обработка файлов (без сохранения)   |
| **app/repositories/**                       | **Repository Pattern (Data Layer)** |
| app/repositories/base.py                    | Базовый репозиторий                 |
| app/repositories/message_repository.py      | Repository для сообщений            |
| app/repositories/conversation_repository.py | Repository для диалогов (CRUD)      |
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
