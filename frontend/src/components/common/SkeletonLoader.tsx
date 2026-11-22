import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`bg-mute/15 rounded-lg shimmer-effect ${className}`}
      aria-hidden="true"
    />
  );
};

export const ListingSkeleton: React.FC = () => {
  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1 mr-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
};
