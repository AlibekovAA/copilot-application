## Архитектура системы

```mermaid
graph TD
    A[Frontend] -->|Простой промпт без файлов| P[Python FastAPI: POST /chat]
    A -->|Промпт с файлами| G[Go Backend: POST /task]

    P -->|HTTP request| Q[Qwen API]
    Q -->|Ответ| P
    P -->|Ответ| A

    G -->|Загрузка файлов| M[(MinIO S3)]
    G -->|Создание задачи| D[(PostgreSQL)]
    G -->|Publish message| R[RabbitMQ]

    R -->|Consume| W[Python RabbitMQ Consumer aio-pika]
    W -->|Скачать файлы| M
    W -->|Парсинг + промпт| Q
    W -->|Сохранить результат| D

    A -->|Polling GET /task/:id| G
    G -->|Статус/результат| D

```

Поток 1: Простое сообщение

```
Frontend → Python FastAPI /chat → Qwen API → FastAPI → Frontend
```

Поток 2: Сообщение с файлами

```
Frontend → Go /task → MinIO + PostgreSQL + RabbitMQ
                    ↓
          Python Consumer → Qwen API → PostgreSQL
                    ↓
Frontend ← Go /task/:id ← PostgreSQL (polling)
```
