# Next.js Frontend - AI Copilot Interface

Next.js приложение для взаимодействия с AI-ассистентом через веб-интерфейс.

## Возможности

- **Интеграция с Python Backend** - отправка текстовых запросов к LLM сервису
- **Загрузка и валидация файлов** - поддержка PDF, DOCX, TXT, изображений с валидацией
- **Управление сессиями** - создание и переключение между диалогами
- **Темная/светлая тема** - переключение темы интерфейса
- **Адаптивный дизайн** - современный UI
- **Авторизация** - страницы входа и регистрации
- **Docker ready** - готов к развертыванию в контейнере
- **Умная прокрутка** - автоматическая прокрутка с приоритетом пользователя

## Структура проекта

| Путь                     | Описание                      |
| ------------------------ | ----------------------------- |
| package.json             | npm/pnpm зависимости          |
| next.config.mjs          | Next.js конфигурация          |
| Dockerfile               | Docker образ                  |
| docker-compose.yml       | Docker Compose                |
| app/page.js              | Главная страница (чат)        |
| app/layout.js            | Корневой layout               |
| app/auth/page.js         | Страница авторизации          |
| app/components/copilot/  | Компоненты чата               |
| ├── QuestionPanel.jsx    | Панель ввода вопроса и файлов |
| ├── ConversationView.jsx | Отображение диалога           |
| ├── SessionList.jsx      | Список сессий                 |
| ├── TopicButtons.jsx     | Кнопки выбора темы            |
| └── icons.jsx            | Иконки компонентов            |
| app/components/auth/     | Компоненты авторизации        |
| ├── LoginForm.jsx        | Форма входа                   |
| ├── SignupForm.jsx       | Форма регистрации             |
| └── WelcomeScreen.jsx    | Приветственный экран          |
| app/components/ui/       | UI компоненты (Radix UI)      |
| app/context/             | React контексты               |
| ├── AuthContext.jsx      | Контекст авторизации          |
| └── ThemeContext.jsx     | Контекст темы                 |
| app/utils/               | Утилиты                       |
| ├── fileValidation.js    | Валидация загружаемых файлов  |
| └── mockLLM.js           | Мок для тестирования          |

## Установка и настройка

### Установить зависимости

```bash
pnpm install
```

## Разработка

### Запустить dev сервер

```bash
pnpm dev
```

Приложение будет доступно на `http://localhost:3000`

### Сборка для production

```bash
pnpm build
```

### Запуск production сборки

```bash
pnpm start
```

## Docker

### Сборка образа

```bash
docker build -t frontend-app .
```

### Запуск через Docker Compose

Из корня проекта:

```bash
docker-compose up frontend
```

Или из папки `frontend/`:

```bash
docker-compose up --build
```

## Валидация файлов

Приложение поддерживает загрузку файлов со следующими ограничениями:

- **Разрешенные форматы**: `.pdf`, `.docx`, `.txt`, `.png`, `.jpg`, `.doc`, `.jpeg`
- **Максимальный размер файла**: 10MB
- **Максимальное количество файлов**: 5
- **Максимальный суммарный размер**: 10MB

Валидация выполняется на клиенте перед отправкой на сервер.

## API интеграция

### Аутентификация

Приложение интегрировано с Go backend для аутентификации:

- **Login/Register** - бэкенд возвращает JWT токен + данные пользователя
- **Формат ответа:**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "Иван Иванов"
    }
  }
  ```
- **Проверка токена** - при загрузке страницы запрос к `/api/profile`
- **JWT не декодируется на клиенте** - данные приходят с бэкенда

### Текстовые запросы

Отправка текстовых сообщений на Python backend:

**Создание диалога (автоматически при первом сообщении):**

```javascript
POST http://localhost:8000/conversations
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Новый диалог",
  "business_context": "legal"
}
```

**Отправка сообщения:**

```javascript
POST http://localhost:8000/chat
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "conversation_id": 123,  // ID из БД
  "message": "Ваш вопрос",
  "domain": "general"
}
```

**Примечание:** `user_id` извлекается из JWT токена на бэкенде, не передается в запросе.

**Маппинг тем:**

- `#юриспруденция` → `legal`
- `#маркетинг` → `marketing`
- `#финансы` → `finance`
- `#продажи` → `sales`
- `#управление` → `management`
- `#HR` → `hr`

### Файлы

Загрузка файлов (в разработке - будет обрабатываться Go backend).

## Технологии

- **Next.js 16** - React фреймворк
- **React 19** - UI библиотека
- **Tailwind CSS 4** - стилизация
- **Radix UI** - компоненты UI
- **Lucide React** - иконки
- **pnpm** - менеджер пакетов
