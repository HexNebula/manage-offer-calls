import React from 'react';

export default function Card({ children, className = '', padding = true, ...props }) {
  return (
    <div
      {...props}
      className={[
        'bg-white rounded-lg shadow-sm border border-gray-200',
        padding ? 'p-6' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={['flex items-center justify-between mb-4', className].join(' ')}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h2 className={['text-lg font-semibold text-gray-900', className].join(' ')}>
      {children}
    </h2>
  );
}
