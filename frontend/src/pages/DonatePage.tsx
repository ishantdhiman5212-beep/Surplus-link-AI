import React, { useState } from 'react';
import { HeartHandshake, Utensils } from 'lucide-react';
import { DonorForm } from '../components/donate/DonorForm';
import { AIReviewCard } from '../components/donate/AIReviewCard';
import { ActiveListings } from '../components/donate/ActiveListings';
import { FoodListingExtraction } from '../types';
import { useRescue } from '../context/RescueContext';
import { useToast } from '../context/ToastContext';

export const DonatePage: React.FC = () => {
  const { listings, addListing } = useRescue();
  const { showToast } = useToast();

  const [donorName, setDonorName] = useState('Spice Route Restaurant');
  const [extraction, setExtraction] = useState<FoodListingExtraction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePostListing = async (listingData: any) => {
    try {
      await addListing(listingData);
      setExtraction(null);
      showToast('Surplus food posted! Recipient NGOs have been notified.', 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Could not post listing. Please sign in as a donor.';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
          <HeartHandshake className="w-3.5 h-3.5" /> For Donors
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-1">
          Share your surplus meals
        </h2>
        <p className="text-sm text-mute max-w-xl mt-1">
          Write it naturally like a text message. Our AI engine extracts and structures the listing. You always review before posting.
        </p>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & AI Review */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-3xl glass-panel border border-line bg-card/80 shadow-glass">
            {!extraction ? (
              <DonorForm
                donorName={donorName}
                setDonorName={setDonorName}
                onExtracted={(result) => setExtraction(result)}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            ) : (
              <AIReviewCard
                extraction={extraction}
                donorName={donorName}
                onPost={handlePostListing}
                onCancel={() => setExtraction(null)}
              />
            )}
          </div>
        </div>

        {/* Right Column: Active Listings */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <Utensils className="w-4 h-4 text-primary" />
              Active Listings ({listings.length})
            </h3>
            <span className="text-xs text-mute font-mono">Live updates</span>
          </div>

          <ActiveListings listings={listings} />
        </div>
      </div>
    </div>
  );
};
