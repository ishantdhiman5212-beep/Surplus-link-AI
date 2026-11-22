import React from 'react';
import { BarChart3 } from 'lucide-react';
import { ImpactMetrics } from '../components/impact/ImpactMetrics';
import { GoalRing } from '../components/impact/GoalRing';
import { PipelineBreakdown } from '../components/impact/PipelineBreakdown';
import { ImpactCharts } from '../components/impact/ImpactCharts';
import { LiveFeed } from '../components/impact/LiveFeed';
import { useRescue } from '../context/RescueContext';

export const ImpactPage: React.FC = () => {
  const { stats, listings, feed } = useRescue();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" /> Real-Time Analytics
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-1">
          Every kilo counts
        </h2>
        <p className="text-sm text-mute max-w-xl mt-1">
          Measurable environmental and community impact tracked from verified handovers across the rescue network.
        </p>
      </div>

      {/* 4 Big Metrics */}
      <ImpactMetrics stats={stats} />

      {/* Goal Ring & Pipeline Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GoalRing rescuedKg={stats.rescuedKg} goalKg={stats.demoGoalKg} />
        <PipelineBreakdown listings={listings} />
      </div>

      {/* Interactive Recharts Data Visualizations */}
      <ImpactCharts listings={listings} />

      {/* Live Activity Feed */}
      <LiveFeed feed={feed} />
    </div>
  );
};
