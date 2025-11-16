const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://go-backend:8080';

export async function login(email, password) {
  const response = await fetch(`${AUTH_API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка входа' }));
    throw new Error(error.error || 'Ошибка входа');
  }

  const data = await response.json();
  return data.token;
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
    const error = await response.json().catch(() => ({ error: 'Ошибка регистрации' }));
    throw new Error(error.error || 'Ошибка регистрации');
  }

  return await login(email, password);
}

export async function changePassword(oldPassword, newPassword) {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Необходима авторизация');
  }

  const url = `${AUTH_API_URL}/change-password`;
  console.log('[ChangePassword] Request URL:', url);
  console.log('[ChangePassword] Token exists:', !!token);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword,
    }),
  });

  console.log('[ChangePassword] Response status:', response.status);
  console.log('[ChangePassword] Response ok:', response.ok);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Ошибка смены пароля' }));
    console.error('[ChangePassword] Error data:', errorData);
    const errorMessage = errorData.error || errorData.message || `Ошибка смены пароля (${response.status})`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

