'use client';
import { useEffect, useState, ReactNode } from 'react';

interface GameViewportProps {
  children: ReactNode;
}

export function GameViewport({ children }: GameViewportProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function handleResize() {
      // 240 x 160 native limit natively clamping math avoiding fractional boundaries
      const scaleX = window.innerWidth / 240;
      const scaleY = window.innerHeight / 160;
      const newScale = Math.max(1, Math.floor(Math.min(scaleX, scaleY)));
      setScale(newScale);
    }
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial measurement correctly scaling constraints

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden"
      style={{
        '--u': `${scale}px`,
      } as React.CSSProperties}
    >
      <div 
        className="relative bg-black"
        style={{
          width: 'calc(240 * var(--u))',
          height: 'calc(160 * var(--u))',
          imageRendering: 'pixelated'
        }}
      >
        {children}
      </div>
    </div>
  );
}
