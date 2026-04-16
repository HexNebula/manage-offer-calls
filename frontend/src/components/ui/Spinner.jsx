import React from 'react';

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-4',
};

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <span
      className={[
        'inline-block rounded-full border-current border-t-transparent animate-spin',
        sizes[size] || sizes.md,
        className,
      ].join(' ')}
      role="status"
      aria-label="Chargement..."
    />
  );
}
