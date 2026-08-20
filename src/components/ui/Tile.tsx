import React from 'react';

interface TileProps {
  label: string;
  value: string;
  emphasized?: boolean;
  className?: string;
}

export function Tile({ label, value, emphasized = false, className = '' }: TileProps) {
  const isNegative = value.startsWith('-') && value !== '—';
  
  return (
    <div className={`border border-gray-200 rounded-2xl bg-white p-4 scs-shadow ${emphasized ? 'tile-emphasized' : ''} ${className}`}>
      <div className="text-xs font-medium text-gray-600 mb-1 tile-label">
        {label}
      </div>
      <div className={`font-semibold tile-value ${emphasized ? 'text-green-600 text-lg' : 'text-gray-900'} ${isNegative ? 'negative-value' : ''}`}>
        {value}
      </div>
    </div>
  );
}