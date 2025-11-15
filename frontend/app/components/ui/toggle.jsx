'use client';

import * as React from 'react';
import { cn } from './utils';
import styles from './toggle.module.css';

export function Toggle({ checked, onChange, label, className, disabled }) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div className={cn(styles.toggleContainer, className)}>
      {label && (
        <span className={styles.toggleLabel}>
          {label}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          styles.toggleButton,
          checked ? styles.toggleButtonChecked : styles.toggleButtonUnchecked
        )}
      >
        <span
          className={cn(
            styles.toggleThumb,
            checked ? styles.toggleThumbChecked : styles.toggleThumbUnchecked
          )}
        />
      </button>
    </div>
  );
}

