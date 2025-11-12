'use client';

import * as React from 'react';
import { cn } from './utils';

export function Toggle({ checked, onChange, label, className, disabled }) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      {label && (
        <span className="text-sm font-medium text-[var(--app-text-primary)]">
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
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--app-accent-color)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          checked
            ? 'bg-[var(--app-accent-color)]'
            : 'bg-gray-500'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

