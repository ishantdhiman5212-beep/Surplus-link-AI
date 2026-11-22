import React from 'react';
import { Layers } from 'lucide-react';
import { FoodListing } from '../../types';

interface PipelineBreakdownProps {
  listings: FoodListing[];
}

export const PipelineBreakdown: React.FC<PipelineBreakdownProps> = ({ listings }) => {
  const total = listings.length || 1;

  const counts = {
    open: listings.filter((l) => l.status === 'open').length,
    accepted: listings.filter((l) => l.status === 'accepted').length,
    transit: listings.filter((l) => l.status === 'transit').length,
    collected: listings.filter((l) => l.status === 'collected').length,
  };

  const stages = [
    { label: 'Open', count: counts.open, color: 'bg-amber-400' },
    { label: 'Accepted', count: counts.accepted, color: 'bg-blue-400' },
    { label: 'In Transit', count: counts.transit, color: 'bg-orange-400' },
    { label: 'Collected', count: counts.collected, color: 'bg-emerald-500' },
  ];

  return (
    <div className="p-6 rounded-2xl glass-panel border border-line bg-card/80 space-y-4">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mute">
        <Layers className="w-3.5 h-3.5 text-primary" />
        <span>Rescue Pipeline Distribution</span>
      </div>

      {/* Segmented Progress Bar */}
      <div className="w-full h-3 rounded-full bg-mute/15 flex overflow-hidden p-0.5 gap-0.5">
        {stages.map((stage) => {
          const pct = (stage.count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={stage.label}
              className={`${stage.color} h-full rounded-sm transition-all duration-500`}
              style={{ width: `${pct}%` }}
              title={`${stage.label}: ${stage.count}`}
            />
          );
        })}
      </div>

      {/* Legend & Breakdown Rows */}
      <div className="space-y-2 pt-1">
        {stages.map((stage) => {
          const pct = Math.round((stage.count / total) * 100);
          return (
            <div key={stage.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                <span className="text-ink font-medium">{stage.label}</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-mute">{pct}%</span>
                <span className="font-bold text-ink w-6 text-right">{stage.count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
