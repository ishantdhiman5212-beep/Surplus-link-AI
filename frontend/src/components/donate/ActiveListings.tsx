import React from 'react';
import { Clock, MapPin, PackageOpen } from 'lucide-react';
import { FoodListing } from '../../types';
import { Badge } from '../common/Badge';
import { formatTimeHHMM, getMinutesLeft, formatMinutesLeft } from '../../services/matchingEngine';

interface ActiveListingsProps {
  listings: FoodListing[];
  onSelectListing?: (listing: FoodListing) => void;
}

export const ActiveListings: React.FC<ActiveListingsProps> = ({ listings, onSelectListing }) => {
  if (listings.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-line bg-card/30 space-y-3">
        <PackageOpen className="w-10 h-10 text-mute/50 mx-auto" />
        <h4 className="text-sm font-semibold text-ink">No active listings yet</h4>
        <p className="text-xs text-mute max-w-xs mx-auto">
          Type what food you have on the left, let the AI extract details, and post your first surplus rescue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((item) => {
        const minsLeft = getMinutesLeft(item.deadline);
        const isUrgent = minsLeft < 60 && item.status === 'open';

        return (
          <div
            key={item.id}
            onClick={() => onSelectListing?.(item)}
            className="p-4 rounded-xl glass-panel hover:border-primary/40 transition-all border border-line bg-card/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
          >
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-ink truncate group-hover:text-primary transition-colors">
                  {item.title}
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-mute">
                <span className="font-medium text-ink/80">{item.donor}</span>
                <span>•</span>
                <span className="font-mono font-semibold text-primary">{item.kg} kg</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-mute" />
                  <span className="truncate max-w-[140px]">{item.place}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-mute" />
                  {formatTimeHHMM(item.deadline)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
              {item.status === 'open' && (
                <span
                  className={`text-[11px] font-mono font-medium ${
                    isUrgent ? 'text-rose-500 font-bold animate-pulse' : 'text-mute'
                  }`}
                >
                  {formatMinutesLeft(minsLeft)}
                </span>
              )}
              <Badge status={item.status} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
