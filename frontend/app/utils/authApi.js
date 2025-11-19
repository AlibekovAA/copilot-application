import { AUTH_API_URL, getAuthToken } from './apiHelpers';

const formatErrorDetail = (detail) => {
  if (!detail) return '';
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = Array.isArray(item.loc) ? item.loc.join('.') : 'field';
        const message = item.msg || item.message || 'Некорректное значение';
        return `${field}: ${message}`;
      })
      .join('\n');
  }
  if (typeof detail === 'object') {
    if (detail.message) {
      return detail.message;
    }
    if (detail.error) {
      return detail.error;
    }
    if (detail.detail) {
      return formatErrorDetail(detail.detail);
    }
  }
  return String(detail);
};

export async function login(email, password) {
  const response = await fetch(`${AUTH_API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Ошибка входа' }));
    const errorMessage = formatErrorDetail(
      errorData.detail || errorData.error || errorData,
    );
    throw new Error(errorMessage || 'Ошибка входа');
  }

  const data = await response.json();
  return {
    token: data.token,
    user: data.user,
  };
}

export async function register(name, email, password) {
  const response = await fetch(`${AUTH_API_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Ошибка регистрации' }));
    const errorMessage = formatErrorDetail(
      errorData.detail || errorData.error || errorData,
    );
    throw new Error(errorMessage || 'Ошибка регистрации');
  }

  const data = await response.json();
  return {
    token: data.token,
    user: data.user,
  };
}

export async function changePassword(oldPassword, newPassword) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Необходима авторизация');
  }

  const response = await fetch(`${AUTH_API_URL}/api/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword,
    }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Ошибка смены пароля' }));
    const errorMessage = formatErrorDetail(
      errorData.detail || errorData.error || errorData,
    );
    throw new Error(errorMessage || 'Ошибка смены пароля');
  }

  return await response.json();
}
