export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_NAME_LENGTH = 2;
export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(email) {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'Email обязателен для заполнения' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'Введите корректный email адрес' };
  }
  return { valid: true };
}

export function validateName(name) {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Имя обязательно для заполнения' };
  }
  if (name.trim().length < MIN_NAME_LENGTH) {
    return {
      valid: false,
      error: `Имя должно содержать минимум ${MIN_NAME_LENGTH} символа`,
    };
  }
  return { valid: true };
}

export function validatePassword(password) {
  if (!password || password.length === 0) {
    return { valid: false, error: 'Пароль обязателен для заполнения' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символов`,
    };
  }
  return { valid: true };
}

export function validatePasswordMatch(password, confirmPassword) {
  if (!confirmPassword || confirmPassword.length === 0) {
    return { valid: false, error: 'Подтвердите пароль' };
  }
  if (password !== confirmPassword) {
    return { valid: false, error: 'Пароли не совпадают' };
  }
  return { valid: true };
}
