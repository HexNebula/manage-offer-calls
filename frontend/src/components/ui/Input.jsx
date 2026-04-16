import React, { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, helperText, className = '', id, required, ...props },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={[
          'block w-full rounded-md border px-3 py-2 text-sm shadow-sm',
          'placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
          'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          error
            ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
            : 'border-gray-300',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

export default Input;
