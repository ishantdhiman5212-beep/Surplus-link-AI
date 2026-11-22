import React from 'react';
import { Bike, MapPin, Clock, ArrowRight, CheckCircle2, ChevronRight, PackageCheck } from 'lucide-react';
import { NGOS } from '../../services/mockData';
import { Badge } from '../common/Badge';
import { TransitLane } from './TransitLane';
import { HandoverCodeBox } from './HandoverCodeBox';
import { formatTimeHHMM, getMinutesLeft, formatMinutesLeft } from '../../services/matchingEngine';
import { useRescue } from '../../context/RescueContext';
import { useToast } from '../../context/ToastContext';

interface PickupQueueProps {
  onNavigateToNgo?: () => void;
}

export const PickupQueue: React.FC<PickupQueueProps> = ({ onNavigateToNgo }) => {
  const { listings, startPickup, regenerateCode } = useRescue();
  const { showToast } = useToast();

  const activePickups = listings.filter((l) => l.status === 'accepted' || l.status === 'transit');
  const completedPickups = listings.filter((l) => l.status === 'collected');

  const handleStartPickup = async (listingId: string) => {
    try {
      const code = await startPickup(listingId);
      showToast(`Pickup started! Handover token: ${code}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not start pickup. Sign in as a volunteer.', 'error');
    }
  };

  const handleRegenerateCode = async (listingId: string) => {
    try {
      const newCode = await regenerateCode(listingId);
      showToast(`New token ${newCode} generated. Previous token invalidated.`, 'info');
    } catch (err: any) {
      showToast(err?.message || 'Could not regenerate handover token.', 'error');
    }
  };

  if (activePickups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="p-10 rounded-2xl border border-dashed border-line bg-card/40 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Bike className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-ink">No Pickups In Queue</h3>
          <p className="text-xs text-mute max-w-sm mx-auto">
            When recipient NGOs accept a surplus food donation, it instantly appears here for volunteer pickup and delivery.
          </p>
        </div>

        {completedPickups.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-line">
            <h4 className="text-xs font-bold uppercase tracking-wider text-mute flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-500" />
              Recently Completed Deliveries ({completedPickups.length})
            </h4>
            <div className="space-y-2">
              {completedPickups.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl glass-panel border border-line bg-card/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-ink">{item.title}</span>
                    <span className="text-mute ml-2">
                      {item.donor} • <b className="text-primary font-mono">{item.kg} kg</b>
                    </span>
                  </div>
                  <Badge status="collected" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {activePickups.map((listing) => {
          const ngo = NGOS[listing.ngo || ''] || { name: 'Recipient Organization' };
          const minsLeft = getMinutesLeft(listing.deadline);

          return (
            <div
              key={listing.id}
              className="p-5 sm:p-6 rounded-2xl glass-panel border border-line bg-card/80 shadow-glass space-y-4"
            >
              {/* Pickup Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-line pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-ink">{listing.title}</h3>
                  </div>
                  <div className="text-xs text-mute flex flex-wrap items-center gap-2">
                    <span>From: <b className="text-ink">{listing.donor}</b></span>
                    <span>•</span>
                    <span>To: <b className="text-primary font-semibold">{ngo.name}</b></span>
                    <span>•</span>
                    <span className="font-mono font-bold text-primary">{listing.kg} kg</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start">
                  <span className="text-xs font-mono text-mute">
                    {formatMinutesLeft(minsLeft)}
                  </span>
                  <Badge status={listing.status} />
                </div>
              </div>

              {/* Waypoint details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-chip/40 p-3.5 rounded-xl border border-line">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-mute flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" /> Pickup Location
                  </span>
                  <div className="font-semibold text-ink">{listing.place}</div>
                  <div className="text-[11px] text-mute">Donor: {listing.donor}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-mute flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" /> Drop-off Deadline
                  </span>
                  <div className="font-semibold text-ink font-mono">{formatTimeHHMM(listing.deadline)}</div>
                  <div className="text-[11px] text-mute">NGO: {ngo.name}</div>
                </div>
              </div>

              {/* Transit Lane Visual Animation */}
              <TransitLane listing={listing} />

              {/* Handover Code or Start Action */}
              {listing.status === 'transit' && listing.code ? (
                <div className="space-y-3">
                  <HandoverCodeBox
                    code={listing.code}
                    codeAt={listing.codeAt}
                    qrImage={listing.qrImage}
                    onRegenerate={() => handleRegenerateCode(listing.id)}
                  />

                  {onNavigateToNgo && (
                    <button
                      onClick={onNavigateToNgo}
                      className="w-full py-2.5 px-4 rounded-xl glass-chip border border-primary/30 text-xs font-semibold text-primary hover:bg-primary-soft flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Simulate Arriving at NGO Handover Desk</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handleStartPickup(listing.id)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:opacity-95 transition-opacity"
                >
                  <Bike className="w-4 h-4" />
                  Start Pickup & Generate Handover QR
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Completed section */}
      {completedPickups.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-line">
          <h4 className="text-xs font-bold uppercase tracking-wider text-mute flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Verified & Delivered Rescues ({completedPickups.length})
          </h4>
          <div className="space-y-2">
            {completedPickups.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl glass-panel border border-line bg-card/60 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold text-ink">{item.title}</span>
                  <span className="text-mute ml-2">
                    {item.donor} • <b className="text-primary font-mono">{item.kg} kg</b>
                  </span>
                </div>
                <Badge status="collected" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
