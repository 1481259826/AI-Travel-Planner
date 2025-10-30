'use client';

import * as React from 'react';

export interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export function Checkbox({
  id,
  checked = false,
  onCheckedChange,
  disabled = false,
  label,
  description,
}: CheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
  };

  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-700"
      />
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label
              htmlFor={id}
              className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
