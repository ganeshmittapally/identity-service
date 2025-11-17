import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, padding = 'md', clickable = false, onClick }) => {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      className={clsx(
        'card',
        paddingClasses[padding],
        clickable && 'cursor-pointer hover:shadow-lg transition-shadow',
        className
      )}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => (
  <div className={clsx('mb-4 pb-4 border-b border-gray-200', className)}>
    {children}
  </div>
);

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className }) => (
  <div className={className}>
    {children}
  </div>
);

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => (
  <div className={clsx('mt-6 pt-4 border-t border-gray-200', className)}>
    {children}
  </div>
);

interface CardTitleProps {
  children: React.ReactNode;
  level?: 'h2' | 'h3' | 'h4';
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, level = 'h2', className }) => {
  const Element = level;
  const baseClasses = 'font-semibold text-gray-900';
  const sizeClasses = {
    h2: 'text-xl',
    h3: 'text-lg',
    h4: 'text-base',
  };

  return (
    <Element className={clsx(baseClasses, sizeClasses[level], className)}>
      {children}
    </Element>
  );
};
