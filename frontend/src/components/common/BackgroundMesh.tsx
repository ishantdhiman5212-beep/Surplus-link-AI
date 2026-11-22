import React from 'react';

export const BackgroundMesh: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* Blob A - Warm Apricot / Amber top right */}
      <div 
        className="absolute rounded-full blur-[80px] opacity-75 w-[50vw] h-[50vw] max-w-[680px] max-h-[680px] -right-[6vw] -top-[6vw] animate-float-slow"
        style={{ backgroundColor: 'var(--blob-a)' }}
      />
      {/* Blob B - Sunset Blush Pink bottom left */}
      <div 
        className="absolute rounded-full blur-[85px] opacity-65 w-[48vw] h-[48vw] max-w-[620px] max-h-[620px] -left-[10vw] -bottom-[8vw]"
        style={{ backgroundColor: 'var(--blob-b)' }}
      />
      {/* Blob C - Golden Sunshine Peach center */}
      <div 
        className="absolute rounded-full blur-[70px] opacity-55 w-[36vw] h-[36vw] max-w-[460px] max-h-[460px] left-[32vw] top-[30vh]"
        style={{ backgroundColor: 'var(--blob-c)' }}
      />
    </div>
  );
};
