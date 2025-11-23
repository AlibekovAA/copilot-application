import { formatErrorDetail } from './errorHelpers';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:8080';

export function getAuthToken() {
  return typeof window !== 'undefined'
    ? localStorage.getItem('auth_token')
    : null;
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function handleApiError(response, fallbackMessage) {
  const errorData = await response.json().catch(() => ({}));
  const errorMessage =
    formatErrorDetail(errorData.detail || errorData.error || errorData) ||
    fallbackMessage;
  return errorMessage;
}

export const TYPING_INTERVAL_MS = 12;
export const JWT_TOKEN_MAX_AGE = 72 * 60 * 60;

export const VALID_ROUTES = ['/', '/auth'];
