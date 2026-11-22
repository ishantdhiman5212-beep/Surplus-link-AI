import React from 'react';
import { FoodListing } from '../../types';
import { NGOS } from '../../services/mockData';

interface TransitLaneProps {
  listing: FoodListing;
}

export const TransitLane: React.FC<TransitLaneProps> = ({ listing }) => {
  const isTransit = listing.status === 'transit';
  const isCollected = listing.status === 'collected';
  const progressPercent = isCollected ? 100 : isTransit ? 50 : 0;
  const ngo = NGOS[listing.ngo || ''] || { name: 'Recipient NGO' };

  return (
    <div className="py-4 space-y-3">
      {/* Route Markers Bar */}
      <div className="relative pt-6 pb-2">
        {/* Background Track Line */}
        <div className="absolute top-1/2 left-4 right-4 h-1.5 -translate-y-1/2 bg-mute/20 rounded-full" />
        
        {/* Active Progress Fill */}
        <div
          className="absolute top-1/2 left-4 h-1.5 -translate-y-1/2 bg-primary rounded-full transition-all duration-700"
          style={{ width: `calc(${progressPercent}% - 16px)` }}
        />

        {/* Node 1: Donor */}
        <div className="absolute top-1/2 left-4 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
            1
          </div>
        </div>

        {/* Node 2: Midway */}
        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
              isTransit || isCollected
                ? 'bg-primary text-white shadow-sm'
                : 'bg-card border border-line text-mute'
            }`}
          >
            2
          </div>
        </div>

        {/* Node 3: NGO */}
        <div className="absolute top-1/2 right-4 -translate-y-1/2 translate-x-1/2 flex flex-col items-center">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
              isCollected
                ? 'bg-primary text-white shadow-sm'
                : 'bg-card border border-line text-mute'
            }`}
          >
            3
          </div>
        </div>

        {/* Animated Scooter Rider */}
        {isTransit && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-10 transition-all duration-500 animate-pulse-subtle pointer-events-none"
          >
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-primary text-white shadow-md">
                Rider en route
              </span>
              <svg className="w-10 h-7 mt-0.5 text-primary" viewBox="0 0 54 37" fill="none">
                <g className="wheel-spin" style={{ transformOrigin: '10px 29px' }}>
                  <circle cx="10" cy="29" r="6" fill="currentColor" />
                  <path d="M10 24v10M5 29h10" stroke="white" strokeWidth="1.4" />
                </g>
                <g className="wheel-spin" style={{ transformOrigin: '44px 29px' }}>
                  <circle cx="44" cy="29" r="6" fill="currentColor" />
                  <path d="M44 24v10M39 29h10" stroke="white" strokeWidth="1.4" />
                </g>
                <path
                  d="M10 29h14l6-11h9l5 11"
                  stroke="currentColor"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect x="14" y="6" width="16" height="12" rx="3" fill="#F59E0B" stroke="currentColor" strokeWidth="2" />
                <path d="M38 18l3-11h5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Route Labels */}
      <div className="flex items-center justify-between text-xs text-mute font-medium px-1">
        <span className="truncate max-w-[120px]">
          <b className="text-ink font-semibold block truncate">{listing.donor}</b>
          Donor Pickup
        </span>
        <span className="text-center font-mono text-[11px] text-primary">
          {isCollected ? 'Delivered' : isTransit ? 'In Transit' : 'Accepted'}
        </span>
        <span className="truncate max-w-[120px] text-right">
          <b className="text-ink font-semibold block truncate">{ngo.name}</b>
          Recipient
        </span>
      </div>
    </div>
  );
};
