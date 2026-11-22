import React, { useState, useEffect } from 'react';
import { Building2, Inbox, Sparkles, LogIn, CheckCircle2 } from 'lucide-react';
import { NgoSelector } from '../components/ngo/NgoSelector';
import { NgoOfferCard } from '../components/ngo/NgoOfferCard';
import { HandoverDesk } from '../components/ngo/HandoverDesk';
import { NgoPickups } from '../components/ngo/NgoPickups';
import { useRescue } from '../context/RescueContext';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/auth/AuthModal';

export const NgoPage: React.FC = () => {
  const {
    listings,
    activeNgo,
    setActiveNgo,
    acceptListing,
    declineListing,
    declinedListings,
  } = useRescue();

  const { user, isNgo } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Sync selected NGO if logged in as an NGO user
  useEffect(() => {
    if (isNgo && user?.organisationId && user.organisationId !== activeNgo) {
      setActiveNgo(user.organisationId);
    }
  }, [isNgo, user, activeNgo, setActiveNgo]);

  const availableOffers = listings.filter(
    (l) => l.status === 'open' && !(declinedListings[l.id] || []).includes(activeNgo)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> For Recipient Organizations
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-1">
            Food waiting for you
          </h2>
          <p className="text-sm text-mute max-w-xl mt-1">
            Every donation displays an AI match score showing how well it fits your capacity, timing, and diet preferences.
          </p>
        </div>

        {isNgo && user ? (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3 shrink-0">
            <div className="text-2xl">{user.avatar || '🏢'}</div>
            <div>
              <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {user.organisationName || user.name}
              </div>
              <div className="text-[11px] text-mute font-mono">Logged in • NGO Front Desk</div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-card/80 border border-line hover:border-primary/50 text-xs font-bold text-ink shadow-sm transition-all shrink-0 self-start sm:self-auto"
          >
            <LogIn className="w-4 h-4 text-primary" />
            <span>Sign in as NGO Partner</span>
          </button>
        )}
      </div>

      {/* Perspective Switcher */}
      <NgoSelector activeNgo={activeNgo} onSelectNgo={setActiveNgo} />

      {/* Available Offers Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-ink flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Incoming Surplus Offers ({availableOffers.length})
          </h3>
          <span className="text-xs text-mute font-mono">Ranked by AI compatibility</span>
        </div>

        {availableOffers.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {availableOffers.map((listing) => (
              <NgoOfferCard
                key={listing.id}
                listing={listing}
                activeNgoId={activeNgo}
                onAccept={(id) => acceptListing(id, activeNgo)}
                onDecline={(id) => declineListing(id, activeNgo)}
              />
            ))}
          </div>
        ) : (
          <div className="p-10 rounded-2xl border border-dashed border-line bg-card/40 text-center space-y-3">
            <Inbox className="w-10 h-10 text-mute/50 mx-auto" />
            <h4 className="text-base font-bold text-ink">No Food Offers Waiting Right Now</h4>
            <p className="text-xs text-mute max-w-sm mx-auto">
              New donations will appear here the moment local donors or restaurants post surplus meals.
            </p>
          </div>
        )}
      </div>

      {/* Handover Verification Desk */}
      <div className="space-y-4 pt-4 border-t border-line">
        <HandoverDesk activeNgoId={activeNgo} />
      </div>

      {/* Pickups History / In Transit */}
      <div className="space-y-4 pt-4 border-t border-line">
        <h3 className="font-bold text-base text-ink">Organization Pickups</h3>
        <NgoPickups listings={listings} activeNgoId={activeNgo} />
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultRole="ngo"
      />
    </div>
  );
};
