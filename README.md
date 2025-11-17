## Архитектура системы

### Сервисы

- **[Frontend](frontend/README.md)** - Next.js веб-интерфейс для взаимодействия с AI
- **[FastAPI LLM Service](backend/llm_service/README.md)** - микросервис обработки запросов к LLM с поддержкой истории диалогов
- **[Go-Authentication ](backend/go/README.md)** - микросервис для авторизации
- **PostgreSQL** - база данных для хранения диалогов и сообщений

```mermaid
graph TD
  A[Frontend] -->|Auth| G[Go Auth/API login-register]
  A -->|JWT| F[FastAPI App]
  G --> |INSERT/SELECT| D[(PostgreSQL)]
  F -->|POST /chat| L[LLM API]
  F -->|POST /chat (files optional)| T[OCR inline]
  F -->|INSERT/SELECT| D[(PostgreSQL)]
  A -->|GET /conversations/:id/messages| F
```

### Поток 1: Простое сообщение

```
Клиент с валидным JWT вызывает POST /chat с текстом и conversation_id; FastAPI сохраняет user‑message в messages, синхронно вызывает LLM и сохраняет assistant‑message, после чего возвращает ответ и id созданного сообщения.
```

### Поток 2: Сообщение с файлами

```
Клиент вызывает POST /chat (multipart form-data) с conversation_id и файлами; FastAPI валидирует расширения, извлекает текст (PDF/DOCX/TXT/MD), добавляет содержимое к сообщению и синхронно вызывает LLM. После получения ответа оба сообщения сохраняются в PostgreSQL и клиент получает готовый ответ.
```

### Поток 3: История диалога

```
Клиент делает GET /conversations/:id/messages, FastAPI читает из PostgreSQL и возвращает постранично в порядке created_at, что позволяет фронту опрашивать прогресс файла после 202.
```

### Поток 4: Аутентификация

```
Клиент регистрируется/логинится в Go, который пишет/читает users и выдаёт JWT; этот токен используется в заголовке при запросах к FastAPI, где выполняется проверка подписи и авторизации.
```

### Поток 5: Как выдержать нагрузку

```
OCR/LLM выполняются в основном обработчике /chat, поэтому важно контролировать размеры файлов и таймауты (ограничения настроены в FileService). При необходимости можно вынести обработку в фоновые задачи или очередь — код легко расширяется.

Перед обработкой файлы читаются в память и текст урезается до 50k символов, что защищает БД и LLM от перегруза. FastAPI можно масштабировать горизонтально под балансировщиком; все реплики используют общую PostgreSQL.
```

## Быстрый старт

### Запуск всей системы

```bash
# Клонировать репозиторий
git clone <repo-url>
cd copilot_alpha

# Создать .env файл
cp .env.example .env
# Заполнить переменные (MISTRAL_API_KEY и др.)

# Запустить все сервисы
make up
```

### Запуск через docker-compose напрямую

```bash
# Клонировать репозиторий
git clone <repo-url>
cd copilot_alpha

# Создать .env файл
cp .env.example .env
# Заполнить переменные (MISTRAL_API_KEY и др.)

# Поднять сервисы без make
docker-compose up --build
```

### Остановка docker-compose

```bash
docker-compose down
```

Сервисы будут доступны:

- **Frontend**: http://localhost:3000
- **FastAPI**: http://localhost:8000
- **Go-auth**: http://localhost:8080
- **PostgreSQL**: localhost:5432

### Остановка

```bash
make down
```

### Полный перезапуск (быстрый)

```bash
make reup
```

### Пересборка без кэша

```bash
make rebuild
```

## Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# PostgreSQL
POSTGRES_USER=user
POSTGRES_PASSWORD=postgres
POSTGRES_DB=db

# FastAPI
DATABASE_URL=postgresql+asyncpg://user:postgres@db:5432/db
MISTRAL_API_KEY=your_mistral_api_key_here
MISTRAL_MODEL=mistral-small-latest

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000

#Auth
JWT_SECRET=jwt_token
```
