import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function Card({ title, children, action, className = '' }: CardProps) {
  return (
    <section className={`bg-white border border-gray-200 rounded-2xl scs-shadow hover:shadow-lg transition-shadow ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold scs-primary">{title}</h2>
        {action && <div>{action}</div>}
      </div>
      <div className="p-4">
        {children}
      </div>
    </section>
  );
}