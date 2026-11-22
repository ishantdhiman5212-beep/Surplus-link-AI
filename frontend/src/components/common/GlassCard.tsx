import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow = false,
  ...props
}) => {
  return (
    <div
      className={`glass-panel rounded-2xl p-5 sm:p-6 transition-all duration-300 relative overflow-hidden ${
        glow ? 'hover:shadow-glass-hover hover:border-primary/30' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
