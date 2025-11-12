│ ├── pyproject.toml
│ ├── README.md
│ ├── Dockerfile
│ ├── python.yml
│ │
│ ├── app/
│ │ ├── **init**.py
│ │ ├── main.py # FastAPI приложение
│ │ ├── consumer.py # RabbitMQ consumer (отдельный процесс)
│ │ │
│ │ ├── core/
│ │ │ ├── **init**.py
│ │ │ ├── config.py # Settings через Pydantic
│ │ │ ├── database.py # SQLAlchemy async session
│ │ │ └── events.py # Startup/shutdown handlers
│ │ │
│ │ ├── api/
│ │ │ ├── **init**.py
│ │ │ ├── router.py
│ │ │ └── endpoints/
│ │ │ │ ├── **init**.py
│ │ │ │ ├── chat.py # POST /api/v1/chat
│ │ │ │ └── health.py # GET /health
│ │ │
│ │ ├── schemas/
│ │ │ ├── **init**.py
│ │ │ ├── chat.py # ChatRequest, ChatResponse
│ │ │ └── task.py # TaskStatus (для consumer)
│ │ │
│ │ ├── models/
│ │ │ ├── **init**.py
│ │ │ ├── base.py
│ │ │ └── task.py # Task SQLAlchemy модель
│ │ │
│ │ ├── services/
│ │ │ ├── **init**.py
│ │ │ ├── qwen_service.py # HTTP клиент для Qwen API
│ │ │ ├── minio_service.py # Работа с MinIO
│ │ │ ├── file_service.py # Парсинг файлов (PDF, DOCX, CSV, images)
│ │ │ └── task_service.py # Обновление статуса задач в БД
│ │ │
│ │ ├── consumers/
│ │ │ ├── **init**.py
│ │ │ └── task_consumer.py # RabbitMQ consumer с aio-pika
│ │ │
│ │ ├── middleware/
│ │ │ ├── **init**.py
│ │ │ ├── cors.py
│ │ │
│ │ └── utils/
│ │ ├── **init**.py
│ │ ├── logger.py # Structlog настройка
