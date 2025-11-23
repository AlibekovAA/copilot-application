'use client';
import { useState } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Eye, EyeOff } from '../copilot/icons';
import styles from './password-input.module.css';

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  className = '',
  showValidation = false,
  isValid = null,
  errorMessage = '',
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={styles.field}>
      {label && (
        <Label htmlFor={id} className={styles.label}>
          {label}
        </Label>
      )}
      <div className={styles.inputWrapper}>
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`${styles.input} ${className} ${
            showValidation && isValid === true ? styles.inputValid : ''
          } ${showValidation && isValid === false ? styles.inputInvalid : ''}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className={styles.toggleButton}
          aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
        >
          {showPassword ? (
            <EyeOff className={styles.toggleIcon} />
          ) : (
            <Eye className={styles.toggleIcon} />
          )}
        </button>
      </div>
      {showValidation && errorMessage && (
        <p className={styles.errorMessage}>{errorMessage}</p>
      )}
    </div>
  );
}
