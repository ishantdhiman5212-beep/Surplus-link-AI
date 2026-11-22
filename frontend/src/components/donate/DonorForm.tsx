import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { extractFoodListing } from '../../services/api';
import { FoodListingExtraction } from '../../types';
import { useToast } from '../../context/ToastContext';

interface DonorFormProps {
  donorName: string;
  setDonorName: (name: string) => void;
  onExtracted: (extraction: FoodListingExtraction) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const SAMPLE_PROMPTS = [
  '30 kg rice and dal, pickup before 6 PM from MG Road',
  '50 plates paneer curry by 9 pm',
  'Bread and cakes 10 kg at Royal Bakery till 10 pm',
  '45 boxes freshly cooked lunch from TechPark Cafeteria before 3 PM',
];

export const DonorForm: React.FC<DonorFormProps> = ({
  donorName,
  setDonorName,
  onExtracted,
  isLoading,
  setIsLoading,
}) => {
  const [foodText, setFoodText] = useState('');
  const { showToast } = useToast();

  const handleExtract = async () => {
    if (foodText.trim().length < 3) return;

    setIsLoading(true);
    try {
      const result = await extractFoodListing(foodText.trim());
      onExtracted(result);
      showToast(
        `AI extracted listing via ${result.provider_used.toUpperCase()}`,
        result.missing_fields.length > 0 ? 'warning' : 'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to extract food listing', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSample = (sample: string) => {
    setFoodText(sample);
  };

  return (
    <div className="space-y-5">
      {/* Donor / Kitchen Name */}
      <div className="space-y-1.5">
        <label htmlFor="donor-name" className="block text-xs font-bold uppercase tracking-wider text-mute">
          Your Name / Establishment
        </label>
        <input
          id="donor-name"
          type="text"
          value={donorName}
          onChange={(e) => setDonorName(e.target.value)}
          placeholder="e.g. Spice Route Restaurant, Caterers, or Wedding Banquet"
          className="w-full px-4 py-2.5 rounded-xl border border-line bg-card/60 text-sm text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
        />
      </div>

      {/* Free-Text Food Description */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="food-text" className="block text-xs font-bold uppercase tracking-wider text-mute">
            What surplus food do you have?
          </label>
          <span className="text-[11px] text-mute">Natural language text</span>
        </div>
        <textarea
          id="food-text"
          rows={3}
          value={foodText}
          onChange={(e) => setFoodText(e.target.value)}
          placeholder="e.g. 30 kg steamed rice and dal, pickup before 6 PM from MG Road Metro Gate 2"
          className="w-full px-4 py-3 rounded-xl border border-line bg-card/60 text-sm text-ink placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
        />
      </div>

      {/* Sample Prompt Chips */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-mute block">
          Try a quick demo sample
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSample(prompt)}
              className="text-left text-xs px-2.5 py-1.5 rounded-lg border border-line/80 glass-chip hover:bg-card hover:border-primary/50 text-ink/80 hover:text-ink transition-colors"
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>

      {/* Extract Button */}
      <button
        type="button"
        onClick={handleExtract}
        disabled={foodText.trim().length < 3 || isLoading}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing with 3-Tier AI Engine...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-amber-300" />
            Extract details with AI
            <ArrowRight className="w-4 h-4 ml-1" />
          </>
        )}
      </button>
    </div>
  );
};
