import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MapPin, Clock, Sparkles } from 'lucide-react';
import { FoodListing, NgoMatchScore } from '../../types';
import { NGOS } from '../../services/mockData';
import { rankNgosForListing, scoreNgoForListing, formatTimeHHMM, getMinutesLeft, formatMinutesLeft } from '../../services/matchingEngine';
import { fetchMatchingSuggestions } from '../../services/api';
import { toFrontendMatch } from '../../services/adapters';
import { useRescue } from '../../context/RescueContext';
import { useToast } from '../../context/ToastContext';

interface NgoOfferCardProps {
  listing: FoodListing;
  activeNgoId: string;
  onAccept: (listingId: string) => void;
  onDecline: (listingId: string) => void;
}

export const NgoOfferCard: React.FC<NgoOfferCardProps> = ({
  listing,
  activeNgoId,
  onAccept,
  onDecline,
}) => {
  const { isBackendLive } = useRescue();
  const { showToast, triggerConfetti } = useToast();
  const [isAccepted, setIsAccepted] = useState(false);
  const [backendMatches, setBackendMatches] = useState<NgoMatchScore[] | null>(null);

  useEffect(() => {
    if (!isBackendLive || !/^\d+$/.test(listing.id)) {
      setBackendMatches(null);
      return;
    }
    let active = true;
    fetchMatchingSuggestions(Number(listing.id))
      .then((matches) => {
        if (active) setBackendMatches(matches.map(toFrontendMatch));
      })
      .catch(() => {
        if (active) setBackendMatches(null);
      });
    return () => {
      active = false;
    };
  }, [isBackendLive, listing.id]);

  const rankings = backendMatches ?? rankNgosForListing(listing);
  const myMatch =
    rankings.find((rank) => rank.id === activeNgoId) ??
    (backendMatches
      ? {
          id: activeNgoId,
          name: NGOS[activeNgoId]?.name || activeNgoId,
          ok: false,
          score: 0,
          tags: [],
          why: 'Not in the backend eligible shortlist for this donation.',
          d: 0,
        }
      : scoreNgoForListing(listing, activeNgoId));
  const minsLeft = getMinutesLeft(listing.deadline);

  const handleAccept = () => {
    setIsAccepted(true);
    triggerConfetti();
    setTimeout(() => {
      onAccept(listing.id);
      showToast(`Donation accepted! Volunteers in the area have been notified.`, 'success');
    }, 800);
  };

  const handleDecline = () => {
    onDecline(listing.id);
    showToast('Listing passed for this organization.', 'info');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-5 sm:p-6 rounded-2xl glass-panel border border-line bg-card/75 shadow-glass space-y-5 relative overflow-hidden"
    >
      {/* Accepted Overlay Animation */}
      <AnimatePresence>
        {isAccepted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 bg-emerald-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white text-center p-6 space-y-2"
          >
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
              <Check className="w-8 h-8 text-white stroke-[3]" />
            </div>
            <h4 className="text-xl font-bold">Donation Accepted!</h4>
            <p className="text-xs text-white/80 max-w-xs">
              Pickup request is now active in the Volunteer queue.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offer Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-bold">
            {listing.categoryLabel || 'Surplus Food'}
          </span>
          <h3 className="text-lg font-bold text-ink leading-snug">{listing.title}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute pt-0.5">
            <span className="font-medium text-ink/80">{listing.donor}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {listing.place}
            </span>
            <span>•</span>
            <span className="font-mono font-bold text-primary">{listing.kg} kg</span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              Before {formatTimeHHMM(listing.deadline)}
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="text-xs font-mono text-mute bg-chip px-2.5 py-1 rounded-full border border-line">
            {formatMinutesLeft(minsLeft)}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Open
          </span>
        </div>
      </div>

      {/* Match Score & Criteria Chips */}
      <div className="p-4 rounded-xl bg-chip/50 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-mono font-bold text-xl border shadow-inner ${
              myMatch.ok
                ? 'bg-gradient-to-br from-emerald-500/20 to-primary/10 text-primary border-primary/30'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}
          >
            <span>{myMatch.ok ? myMatch.score : '0'}</span>
            <span className="text-[9px] uppercase tracking-wider text-mute -mt-1">Match</span>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-bold text-ink flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {myMatch.ok ? 'AI Compatibility Assessment' : 'Requirement Conflict'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {myMatch.ok ? (
                myMatch.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 rounded-md glass-chip text-mute border border-line font-medium"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 font-medium">
                  {myMatch.why}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right text-xs font-mono text-mute shrink-0">
          <div>Distance: <b className="text-ink">{myMatch.d} km</b></div>
          <div>Transit ETA: <b className="text-ink">~{Math.round(myMatch.d * 5 + 15)} mins</b></div>
        </div>
      </div>

      {/* Full AI Ranking Comparison across NGOs */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-mute">
          <span>AI Ranking Across Recipient Network</span>
          <span>Compatibility</span>
        </div>
        <div className="space-y-1.5">
          {rankings.map((rank, idx) => {
            const isMe = rank.id === activeNgoId;
            return (
              <div
                key={rank.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                  isMe
                    ? 'bg-primary-soft/60 border-primary/40 font-medium text-ink'
                    : 'bg-card/40 border-line text-mute'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-chip flex items-center justify-center font-mono text-[11px] font-bold text-ink">
                    {idx + 1}
                  </span>
                  <span className="truncate text-ink font-semibold">
                    {NGOS[rank.id]?.name}
                    {isMe && <span className="ml-1.5 text-[10px] text-primary font-bold italic">(You)</span>}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {rank.ok ? (
                    <>
                      <div className="w-24 sm:w-32 bg-mute/20 rounded-full h-2 overflow-hidden hidden sm:block">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-500"
                          style={{ width: `${rank.score}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-primary w-8 text-right">
                        {rank.score}
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] text-mute/80 italic">{rank.why}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleAccept}
          disabled={!myMatch.ok}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          Accept Donation
        </button>
        <button
          onClick={handleDecline}
          className="px-4 py-2.5 rounded-xl glass-chip border border-line text-xs font-medium text-mute hover:text-ink transition-colors"
        >
          Pass
        </button>
      </div>
    </motion.div>
  );
};
