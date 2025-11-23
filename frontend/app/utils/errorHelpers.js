const translateErrorMessage = (message) => {
  if (!message) return '';

  const translations = {
    'invalid credentials': 'Неверный email или пароль',
    'email already exists': 'Email уже зарегистрирован',
    'invalid request body': 'Некорректные данные запроса',
    'missing required fields': 'Заполните все обязательные поля',
    'invalid email format': 'Некорректный формат email',
    'name must be at least 2 characters long':
      'Имя должно содержать минимум 2 символа',
    'password must be at least 8 characters long':
      'Пароль должен содержать минимум 8 символов',
    'internal server error': 'Внутренняя ошибка сервера',
    'registration failed': 'Ошибка регистрации',
    'token generation failed': 'Ошибка генерации токена',
    unauthorized: 'Необходима авторизация',
    'user not found': 'Пользователь не найден',
    'invalid old password': 'Неверный текущий пароль',
    'new password must be at least 8 characters long':
      'Новый пароль должен содержать минимум 8 символов',
    'new password must be different from old password':
      'Новый пароль должен отличаться от текущего',
    'failed to update password': 'Не удалось обновить пароль',
    'password updated successfully': 'Пароль успешно изменен',
    'missing authorization header': 'Отсутствует заголовок авторизации',
    'invalid token': 'Неверный токен',
    'invalid user_id in token': 'Неверный идентификатор пользователя в токене',
    'invalid email in token': 'Неверный email в токене',
    'invalid token claims': 'Неверные данные токена',
    'invalid or expired token': 'Неверный или истекший токен',
    'invalid authorization header format':
      'Неверный формат заголовка авторизации',
    'invalid token: missing user_id': 'Неверный токен: отсутствует user_id',
    'sorry, unable to generate response':
      'Извините, не удалось сгенерировать ответ',
    'invalid json in response from mistral ai':
      'Некорректный JSON в ответе от Mistral AI',
    'timeout waiting for response from mistral ai':
      'Превышено время ожидания ответа от Mistral AI',
    'invalid api key mistral ai': 'Неверный API ключ Mistral AI',
    'request limit exceeded for the configured mistral model. please retry later':
      'Превышен лимит запросов к модели Mistral. Попробуйте позже',
    'error in request to mistral ai': 'Ошибка в запросе к Mistral AI',
    'error when contacting mistral ai': 'Ошибка при обращении к Mistral AI',
    'unexpected error in mistral service':
      'Неожиданная ошибка в сервисе Mistral',
    'invalid pagination parameters': 'Некорректные параметры пагинации',
    'file name is not specified': 'Имя файла не указано',
    'invalid file format': 'Некорректный формат файла',
    'file is too large': 'Файл слишком большой',
    'unsupported file format': 'Неподдерживаемый формат файла',
    'failed to extract text from': 'Не удалось извлечь текст из',
    'pdf file is protected by a password': 'PDF файл защищен паролем',
    'failed to extract text from any page of the pdf':
      'Не удалось извлечь текст ни с одной страницы PDF',
    'error reading pdf': 'Ошибка чтения PDF',
    'document does not contain text': 'Документ не содержит текста',
    'error reading docx': 'Ошибка чтения DOCX',
    'error reading text file': 'Ошибка чтения текстового файла',
  };

  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('conversation') &&
    lowerMessage.includes('not found')
  ) {
    const match = message.match(/conversation\s+(\d+)\s+not\s+found/i);
    if (match) {
      return `Диалог ${match[1]} не найден`;
    }
    return 'Диалог не найден';
  }

  if (lowerMessage.includes('failed to extract text from')) {
    const match = message.match(
      /failed\s+to\s+extract\s+text\s+from\s+(.+?)(?:\s*:|\s*$)/i,
    );
    if (match) {
      return `Не удалось извлечь текст из ${match[1]}`;
    }
  }

  for (const [key, translation] of Object.entries(translations)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return translation;
    }
  }

  return message.replace(
    /string should have at most 10000 characters/gi,
    'Сообщение должно содержать не более 10 000 символов.',
  );
};

export const formatErrorDetail = (detail) => {
  if (!detail) return '';
  if (typeof detail === 'string') {
    return translateErrorMessage(detail);
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const message = item.msg || item.message || 'Некорректное значение';
        const translatedMessage = translateErrorMessage(message);
        const field = Array.isArray(item.loc) ? item.loc.join('.') : 'field';

        if (translatedMessage !== message) {
          return translatedMessage;
        }

        return `${field}: ${translatedMessage}`;
      })
      .join('\n');
  }
  if (typeof detail === 'object') {
    if (detail.error) {
      return translateErrorMessage(detail.error);
    }
    if (detail.message) {
      return translateErrorMessage(detail.message);
    }
    return translateErrorMessage(JSON.stringify(detail));
  }
  return translateErrorMessage(String(detail));
};
