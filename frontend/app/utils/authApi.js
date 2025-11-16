import { AUTH_API_URL, getAuthToken } from './apiHelpers';

export async function login(email, password) {
  const response = await fetch(`${AUTH_API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Ошибка входа' }));
    throw new Error(error.error || 'Ошибка входа');
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
    const error = await response
      .json()
      .catch(() => ({ error: 'Ошибка регистрации' }));
    throw new Error(error.error || 'Ошибка регистрации');
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
    const error = await response
      .json()
      .catch(() => ({ error: 'Ошибка смены пароля' }));
    throw new Error(error.error || 'Ошибка смены пароля');
  }

  return await response.json();
}
