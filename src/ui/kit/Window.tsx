'use client';
import { ReactNode } from 'react';

interface WindowProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Window({ children, className = '', style }: WindowProps) {
  return (
    <div 
      className={`border-white bg-black/90 p-[calc(4*var(--u))] text-white font-mono flex flex-col items-stretch ${className}`}
      style={{
        borderWidth: 'calc(2 * var(--u))',
        borderStyle: 'solid',
        borderRadius: 'calc(2 * var(--u))',
        fontSize: 'calc(8 * var(--u))',
        lineHeight: 'calc(14 * var(--u))',
        ...style
      }}
    >
      {children}
    </div>
  );
}
