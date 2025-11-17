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

## Демонстрация работы приложения

### Регистрация и авторизация
#### Незарегистрированный пользователь
![Authentication Screenshot 1](img/photo_1_2025-11-17_10-20-23.jpg)
#### Несоответствие пароля требованиям
![Authentication Screenshot 2](img/photo_2_2025-11-17_10-20-23.jpg)
#### Ошибка подтверждения пароля
![Authentication Screenshot 3](img/photo_3_2025-11-17_10-20-23.jpg)
#### Неверный формат адреса электронной почты
![Authentication Screenshot 4](img/photo_4_2025-11-17_10-20-23.jpg)
#### Отсутствие имени пользователя
![Authentication Screenshot 5](img/photo_5_2025-11-17_10-20-23.jpg)
#### Успешная регистрация
![Authentication Screenshot 6](img/photo_6_2025-11-17_10-20-23.jpg)
#### Пустое поле адреса при заполнении пароля
![Authentication Screenshot 7](img/photo_7_2025-11-17_10-20-23.jpg)
#### Отправка инструкции по восстановлению пароля
![Authentication Screenshot 8](img/photo_8_2025-11-17_10-20-23.jpg)

### Интерфейс чата
#### Окно чата
![Main Interface 1](img/photo_9_2025-11-17_10-20-23.jpg)
#### Попытка загрузить больше фалов, чем позволено
![Main Interface 2](img/photo_10_2025-11-17_10-20-23.jpg)
#### Ответ модели на простой вопрос без конкретной темы
![File Upload 2](img/photo_12_2025-11-17_10-20-23.jpg)
#### Считывание информации с PDF-файла и вывод запрашиваемого количества страниц
![Feature 1](img/photo_13_2025-11-17_10-20-23.jpg)
#### Копирование текста из ячеек чата
![Feature 2](img/photo_14_2025-11-17_10-20-23.jpg)
#### Переключение между светлой и тёмной темой
![Feature 3](img/photo_15_2025-11-17_10-20-23.jpg)
![Feature 4](img/photo_16_2025-11-17_10-20-23.jpg)
#### Ответ на более комплексный вопрос с выбранной темой
![Feature 5](img/photo_17_2025-11-17_10-20-23.jpg)
#### Удаление чатов
![Feature 6](img/photo_18_2025-11-17_10-20-23.jpg)
![Feature 7](img/photo_19_2025-11-17_10-20-23.jpg)
#### Окно смены пароля
![Feature 8](img/photo_20_2025-11-17_10-20-23.jpg)
#### Обработка некорректных данных при смене пароля
![Feature 9](img/photo_21_2025-11-17_10-20-23.jpg)
![Feature 10](img/photo_22_2025-11-17_10-20-23.jpg)
#### Успешная смена пароля
![Feature 11](img/photo_23_2025-11-17_10-20-23.jpg)
#### Ответ на слишком большие или бессмысленные сообщения
![Feature 12](img/photo_24_2025-11-17_10-20-23.jpg)
![Feature 13](img/photo_25_2025-11-17_10-20-23.jpg)
#### Попытка загрузки слишком большого файла
![Feature 15](img/photo_27_2025-11-17_10-20-23.jpg)


## Команда
| Роль | Имя | Контакт |
|------|-----|---------|
| Техлид | Алибеков Аслан | [AlibekovAA](https://t.me/alibekov_05) |
| Backend | Василов Иван |  [VasilovIS](https://t.me/feof1l)|
| Frontend | Беспалов Никита | [BespalovNV](https://t.me/Tyvmuteclown) |
| Аналитик | Ногеров Ислам | [NogerovIA](https://t.me/mrsigint) |
