import React from 'react';
import { Scale, Utensils, Leaf, Package } from 'lucide-react';
import { ImpactStats } from '../../types';

interface ImpactMetricsProps {
  stats: ImpactStats;
}

export const ImpactMetrics: React.FC<ImpactMetricsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Food Rescued */}
      <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-line bg-card/80 space-y-1 relative overflow-hidden group hover:border-primary/40 transition-all">
        <div className="flex items-center justify-between text-mute">
          <span className="text-xs font-bold uppercase tracking-wider">Food Rescued</span>
          <Scale className="w-4 h-4 text-primary" />
        </div>
        <div className="flex items-baseline gap-1 pt-1">
          <span className="text-2xl sm:text-4xl font-extrabold font-mono text-ink tracking-tight">
            {stats.rescuedKg}
          </span>
          <span className="text-xs sm:text-sm font-bold text-mute">kg</span>
        </div>
        <p className="text-[11px] text-mute">Diverted from municipal landfills</p>
      </div>

      {/* 2. Meals Shared */}
      <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-line bg-card/80 space-y-1 relative overflow-hidden group hover:border-primary/40 transition-all">
        <div className="flex items-center justify-between text-mute">
          <span className="text-xs font-bold uppercase tracking-wider">Meals Shared</span>
          <Utensils className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex items-baseline gap-1 pt-1">
          <span className="text-2xl sm:text-4xl font-extrabold font-mono text-primary tracking-tight">
            {stats.mealsShared}
          </span>
          <span className="text-xs sm:text-sm font-bold text-mute">meals</span>
        </div>
        <p className="text-[11px] text-mute">1 kg ≈ 2.5 wholesome meals</p>
      </div>

      {/* 3. CO2 Avoided */}
      <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-line bg-card/80 space-y-1 relative overflow-hidden group hover:border-primary/40 transition-all">
        <div className="flex items-center justify-between text-mute">
          <span className="text-xs font-bold uppercase tracking-wider">CO₂ Avoided</span>
          <Leaf className="w-4 h-4 text-teal-500" />
        </div>
        <div className="flex items-baseline gap-1 pt-1">
          <span className="text-2xl sm:text-4xl font-extrabold font-mono text-teal-600 dark:text-teal-400 tracking-tight">
            {stats.co2AvoidedKg}
          </span>
          <span className="text-xs sm:text-sm font-bold text-mute">kg</span>
        </div>
        <p className="text-[11px] text-mute">Greenhouse emissions prevented</p>
      </div>

      {/* 4. Total Donations */}
      <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-line bg-card/80 space-y-1 relative overflow-hidden group hover:border-primary/40 transition-all">
        <div className="flex items-center justify-between text-mute">
          <span className="text-xs font-bold uppercase tracking-wider">Donations</span>
          <Package className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex items-baseline gap-1 pt-1">
          <span className="text-2xl sm:text-4xl font-extrabold font-mono text-ink tracking-tight">
            {stats.totalDonations}
          </span>
          <span className="text-xs sm:text-sm font-bold text-mute">total</span>
        </div>
        <p className="text-[11px] text-mute">{stats.activeOpen} open, {stats.inTransit} en route</p>
      </div>
    </div>
  );
};
