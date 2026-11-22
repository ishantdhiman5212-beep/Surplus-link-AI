import React from 'react';
import { Package } from 'lucide-react';
import { FoodListing } from '../../types';
import { Badge } from '../common/Badge';

interface NgoPickupsProps {
  listings: FoodListing[];
  activeNgoId: string;
}

export const NgoPickups: React.FC<NgoPickupsProps> = ({ listings, activeNgoId }) => {
  const ngoListings = listings.filter((l) => l.ngo === activeNgoId && l.status !== 'open');

  if (ngoListings.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-dashed border-line bg-card/30 text-center space-y-2">
        <Package className="w-8 h-8 text-mute/50 mx-auto" />
        <p className="text-xs text-mute">No active or completed pickups for this organization yet.</p>
      </div>
    );
  }

  const getStatusHint = (status: FoodListing['status']) => {
    switch (status) {
      case 'accepted':
        return 'Waiting for a volunteer rider to accept and initiate transit.';
      case 'transit':
        return 'Volunteer is on the way. Scan or request their one-time handover token on arrival.';
      case 'collected':
        return 'Successfully received and verified. Counted in live impact metrics.';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-3">
      {ngoListings.map((item) => (
        <div
          key={item.id}
          className="p-4 rounded-xl glass-panel border border-line bg-card/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-ink">{item.title}</h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-mute">
              <span className="font-medium text-ink/80">{item.donor}</span>
              <span>•</span>
              <span className="font-mono font-semibold text-primary">{item.kg} kg</span>
              <span>•</span>
              <span className="text-[11px] text-mute/90">{getStatusHint(item.status)}</span>
            </div>
          </div>

          <div className="shrink-0 self-end sm:self-center">
            <Badge status={item.status} />
          </div>
        </div>
      ))}
    </div>
  );
};
