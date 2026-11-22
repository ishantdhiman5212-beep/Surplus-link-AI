import React from 'react';
import { Target } from 'lucide-react';

interface GoalRingProps {
  rescuedKg: number;
  goalKg?: number;
}

export const GoalRing: React.FC<GoalRingProps> = ({ rescuedKg, goalKg = 50 }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.min(1, rescuedKg / goalKg);
  const strokeDashoffset = circumference * (1 - fraction);
  const percentage = Math.round(fraction * 100);

  return (
    <div className="p-6 rounded-2xl glass-panel border border-line bg-card/80 text-center space-y-3 flex flex-col items-center justify-center">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mute">
        <Target className="w-3.5 h-3.5 text-primary" />
        <span>Demo Rescue Target</span>
      </div>

      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
          {/* Background Ring */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="9"
            className="text-mute/15"
          />
          {/* Foreground Progress Ring */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="9"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-primary transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold font-mono text-ink tracking-tight">
            {percentage}%
          </span>
          <span className="text-[10px] text-mute font-medium uppercase tracking-wider">
            of {goalKg} kg target
          </span>
        </div>
      </div>

      <p className="text-xs text-mute font-medium">
        <b className="text-ink">{rescuedKg} kg</b> collected out of {goalKg} kg target
      </p>
    </div>
  );
};
