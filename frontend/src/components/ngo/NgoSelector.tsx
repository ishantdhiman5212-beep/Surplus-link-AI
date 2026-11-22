import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { NGOS } from '../../services/mockData';

interface NgoSelectorProps {
  activeNgo: string;
  onSelectNgo: (id: string) => void;
}

export const NgoSelector: React.FC<NgoSelectorProps> = ({ activeNgo, onSelectNgo }) => {
  const current = NGOS[activeNgo] || NGOS.roti;

  return (
    <div className="p-4 rounded-2xl glass-panel border border-line bg-card/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl p-2.5 rounded-xl bg-primary/10 border border-primary/20">
          {current.avatar || '🍲'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-mute">Viewing Perspective</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3" /> Verified Partner
            </span>
          </div>
          <h3 className="font-bold text-base text-ink">{current.name}</h3>
          <p className="text-xs text-mute">{current.location}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="text-xs text-mute font-mono hidden md:block text-right">
          <div>Max Capacity: <b className="text-ink">{current.cap} kg</b></div>
          <div>Accepts: <span className="capitalize">{current.takes.join(', ')}</span></div>
        </div>

        <select
          value={activeNgo}
          onChange={(e) => onSelectNgo(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-line bg-card text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
          aria-label="Switch NGO Perspective"
        >
          {Object.entries(NGOS).map(([key, ngo]) => (
            <option key={key} value={key}>
              {ngo.name} ({ngo.cap} kg cap)
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
