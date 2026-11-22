import React, { useState } from 'react';
import { Activity, RotateCcw, Utensils, CheckCircle2, Bike, HeartHandshake } from 'lucide-react';
import { ActivityFeedItem } from '../../types';
import { useRescue } from '../../context/RescueContext';
import { useToast } from '../../context/ToastContext';

interface LiveFeedProps {
  feed: ActivityFeedItem[];
}

function timeAgo(t: number): string {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} hr${h > 1 ? 's' : ''} ago`;
}

export const LiveFeed: React.FC<LiveFeedProps> = ({ feed }) => {
  const { resetDemoData } = useRescue();
  const { showToast } = useToast();
  const [resetArmed, setResetArmed] = useState(false);

  const handleReset = () => {
    if (resetArmed) {
      resetDemoData();
      setResetArmed(false);
      showToast('Demo data successfully reset to initial baseline', 'info');
    } else {
      setResetArmed(true);
      setTimeout(() => setResetArmed(false), 3500);
    }
  };

  const getCategoryIcon = (cat?: ActivityFeedItem['category']) => {
    switch (cat) {
      case 'listing':
        return <Utensils className="w-3.5 h-3.5 text-amber-500" />;
      case 'accept':
        return <HeartHandshake className="w-3.5 h-3.5 text-blue-500" />;
      case 'pickup':
        return <Bike className="w-3.5 h-3.5 text-orange-500" />;
      case 'handover':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-primary" />;
    }
  };

  return (
    <div className="p-6 rounded-2xl glass-panel border border-line bg-card/80 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h4 className="font-bold text-sm text-ink">Live Rescue Activity Log</h4>
        </div>
        <span className="text-[11px] font-mono text-mute">Instant Sync</span>
      </div>

      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {feed.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-xl bg-chip/40 border border-line flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-card border border-line flex items-center justify-center shrink-0">
                {getCategoryIcon(item.category)}
              </div>
              <span className="text-ink font-medium truncate">{item.text}</span>
            </div>

            <span className="font-mono text-[11px] text-mute shrink-0">
              {timeAgo(item.t)}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px] text-mute">
          Data synchronizes automatically across multiple browser tabs and windows.
        </p>
        <button
          onClick={handleReset}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            resetArmed
              ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
              : 'glass-chip border-line text-mute hover:text-ink hover:border-mute/50'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <RotateCcw className="w-3 h-3" />
            {resetArmed ? 'Confirm Reset Data' : 'Reset Demo Data'}
          </span>
        </button>
      </div>
    </div>
  );
};
