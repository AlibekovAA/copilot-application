const translateErrorMessage = (message) => {
  if (!message) return '';

  const translations = {
    'invalid credentials': 'Неверный email или пароль',
    invalid_credentials: 'Неверный email или пароль',
  };

  const lowerMessage = message.toLowerCase();
  for (const [key, translation] of Object.entries(translations)) {
    if (lowerMessage.includes(key)) {
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
    if (detail.message) {
      return translateErrorMessage(detail.message);
    }
    if (detail.error) {
      return translateErrorMessage(detail.error);
    }
    return translateErrorMessage(JSON.stringify(detail));
  }
  return translateErrorMessage(String(detail));
};
