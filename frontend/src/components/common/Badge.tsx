import React from 'react';
import { ListingStatus } from '../../types';

interface BadgeProps {
  status?: ListingStatus;
  children?: React.ReactNode;
  variant?: 'open' | 'accepted' | 'transit' | 'collected' | 'neutral' | 'urgent';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, children, variant, className = '' }) => {
  let badgeStyle = 'bg-card border-line text-ink';
  let label = children;

  const currentVariant = variant || status;

  switch (currentVariant) {
    case 'open':
      badgeStyle = 'bg-[#FBEECB] text-[#6F4A00] dark:bg-amber-500/15 dark:text-amber-300 border-amber-600/20';
      label = label || 'Open';
      break;
    case 'accepted':
      badgeStyle = 'bg-[#E0EBFA] text-[#1B4A97] dark:bg-blue-500/15 dark:text-blue-300 border-blue-500/20';
      label = label || 'Accepted';
      break;
    case 'transit':
      badgeStyle = 'bg-[#FCE3D4] text-[#96390C] dark:bg-orange-500/15 dark:text-orange-300 border-orange-500/20';
      label = label || 'On the way';
      break;
    case 'collected':
      badgeStyle = 'bg-[#DBEFE2] text-[#14553A] dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-500/20';
      label = label || 'Collected';
      break;
    case 'urgent':
      badgeStyle = 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse';
      break;
    case 'neutral':
    default:
      badgeStyle = 'bg-chip border-line text-mute';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border shadow-sm transition-colors ${badgeStyle} ${className}`}
    >
      {label}
    </span>
  );
};
