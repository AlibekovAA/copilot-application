import { AUTH_API_URL, getAuthToken } from './apiHelpers';
import { formatErrorDetail } from './errorHelpers';

async function handleAuthResponse(response, fallbackError) {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: fallbackError }));
    const errorMessage = formatErrorDetail(
      errorData.detail || errorData.error || errorData,
    );
    throw new Error(errorMessage || fallbackError);
  }
  return await response.json();
}

export async function login(email, password) {
  const response = await fetch(`${AUTH_API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await handleAuthResponse(response, 'Ошибка входа');
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

  const data = await handleAuthResponse(response, 'Ошибка регистрации');
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

  return await handleAuthResponse(response, 'Ошибка смены пароля');
}
