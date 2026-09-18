import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none';
  hover?: boolean;
  bordered?: boolean;
}

export function Card({
  padding = 'md',
  hover = false,
  bordered = true,
  className = '',
  children,
  ...props
}: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={`
        bg-white rounded-2xl shadow-sm
        ${bordered ? 'border border-slate-100' : ''}
        ${paddings[padding]}
        ${hover ? 'card-hover cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
