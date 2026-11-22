import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Cpu, Send, RotateCcw, MapPin, Clock } from 'lucide-react';
import { FoodListingExtraction } from '../../types';
import { CATEGORIES } from '../../services/mockData';
import { useToast } from '../../context/ToastContext';

interface AIReviewCardProps {
  extraction: FoodListingExtraction;
  donorName: string;
  onPost: (listing: {
    title: string;
    cat: 'cooked' | 'bakery' | 'produce' | 'packaged' | 'other';
    categoryLabel: string;
    kg: number;
    deadline: number;
    place: string;
    donor: string;
    rawDraft: string;
  }) => void;
  onCancel: () => void;
}

export const AIReviewCard: React.FC<AIReviewCardProps> = ({
  extraction,
  donorName,
  onPost,
  onCancel,
}) => {
  const { showToast, triggerConfetti } = useToast();

  const [title, setTitle] = useState(extraction.title || '');
  const [category, setCategory] = useState<string>(() => {
    if (extraction.category) {
      if (extraction.category === 'Cooked Meals') return 'cooked';
      if (extraction.category === 'Bakery') return 'bakery';
      if (extraction.category === 'Produce') return 'produce';
      if (extraction.category === 'Grains/Staples' || extraction.category === 'Dairy') return 'packaged';
    }
    return 'cooked';
  });

  const [quantity, setQuantity] = useState<number>(extraction.quantity || 15);
  const [unit, setUnit] = useState<string>(extraction.unit || 'kg');
  
  // Deadline time string (HH:MM)
  const [deadlineTime, setDeadlineTime] = useState<string>(() => {
    if (extraction.deadline) {
      const match = extraction.deadline.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = match[2] ? parseInt(match[2], 10) : 0;
        const ap = match[3]?.toLowerCase();
        if (ap === 'pm' && h < 12) h += 12;
        if (ap === 'am' && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }
    return '19:00';
  });

  const [pickupLocation, setPickupLocation] = useState(extraction.pickup_location || '');

  // Calculate equivalent kg if unit is plates or boxes
  const effectiveKg = React.useMemo(() => {
    if (unit === 'plates' || unit === 'servings') return +(quantity * 0.4).toFixed(1);
    if (unit === 'boxes') return +(quantity * 0.5).toFixed(1);
    if (unit === 'trays') return +(quantity * 2.0).toFixed(1);
    return +quantity.toFixed(1);
  }, [quantity, unit]);

  const mealsCount = Math.round(effectiveKg * 2.5);

  const missingFlags = {
    title: !title.trim(),
    quantity: !(quantity > 0),
    deadline: !deadlineTime,
    place: !pickupLocation.trim(),
  };

  const missingCount = Object.values(missingFlags).filter(Boolean).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Please specify a title for the food item', 'error');
      return;
    }
    if (!(quantity > 0)) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }
    if (!pickupLocation.trim()) {
      showToast('Please specify a pickup location so volunteers can reach you', 'error');
      return;
    }

    const [h, m] = deadlineTime.split(':').map(Number);
    const deadlineMinutes = (h || 0) * 60 + (m || 0);

    triggerConfetti();

    onPost({
      title: title.trim(),
      cat: category as any,
      categoryLabel: CATEGORIES[category as keyof typeof CATEGORIES]?.label || 'Cooked Meals',
      kg: effectiveKg,
      deadline: deadlineMinutes,
      place: pickupLocation.trim(),
      donor: donorName.trim() || 'Your Kitchen',
      rawDraft: extraction.raw_draft,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="p-5 sm:p-6 rounded-2xl bg-card border-2 border-primary/30 shadow-glass space-y-5"
    >
      {/* Review Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-ink">Here is what the AI extracted</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-primary-soft text-primary font-bold border border-primary/20 flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              {extraction.provider_used}
            </span>
          </div>
          <p className="text-xs text-mute mt-0.5">
            {missingCount > 0
              ? `${missingCount} field${missingCount > 1 ? 's' : ''} flagged for verification before posting.`
              : 'Extraction complete and verified. Please confirm below.'}
          </p>
        </div>

        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
          Requires Confirmation
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Title */}
          <div className="sm:col-span-2 space-y-1">
            <div className="flex justify-between items-center text-xs font-semibold text-ink">
              <label htmlFor="rev-title">Food Item Name</label>
              {missingFlags.title && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3 h-3" /> Short name required
                </span>
              )}
            </div>
            <input
              id="rev-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 40 plates veg biryani & raita"
              className={`w-full px-3.5 py-2 rounded-xl border bg-card/80 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                missingFlags.title ? 'border-amber-500/70' : 'border-line'
              }`}
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label htmlFor="rev-cat" className="block text-xs font-semibold text-ink">
              Food Category
            </label>
            <select
              id="rev-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-line bg-card/80 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="cooked">🍲 Cooked Meals</option>
              <option value="bakery">🥐 Bakery</option>
              <option value="produce">🥗 Fresh Produce</option>
              <option value="packaged">📦 Packaged Food</option>
              <option value="other">🍱 Other / Mixed</option>
            </select>
          </div>

          {/* Quantity & Unit */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-semibold text-ink">
              <label htmlFor="rev-qty">Amount & Weight</label>
              <span className="text-[11px] text-primary font-mono font-medium">
                ≈ {mealsCount} meals shared
              </span>
            </div>
            <div className="flex gap-2">
              <input
                id="rev-qty"
                type="number"
                min="0.5"
                step="0.5"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className={`w-1/2 px-3.5 py-2 rounded-xl border bg-card/80 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                  missingFlags.quantity ? 'border-amber-500/70' : 'border-line'
                }`}
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-1/2 px-3 py-2 rounded-xl border border-line bg-card/80 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
              >
                <option value="kg">kg (weight)</option>
                <option value="plates">plates / portions</option>
                <option value="boxes">boxes</option>
                <option value="trays">catering trays</option>
              </select>
            </div>
          </div>

          {/* Pickup Deadline */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-semibold text-ink">
              <label htmlFor="rev-deadline" className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-mute" />
                Pickup Deadline
              </label>
              {missingFlags.deadline && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400">Time needed</span>
              )}
            </div>
            <input
              id="rev-deadline"
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-line bg-card/80 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
            />
          </div>

          {/* Pickup Location */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-semibold text-ink">
              <label htmlFor="rev-place" className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-mute" />
                Pickup Location
              </label>
              {missingFlags.place && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3 h-3" /> Location required
                </span>
              )}
            </div>
            <input
              id="rev-place"
              type="text"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="e.g. Banquet Hall Entrance, MG Road"
              className={`w-full px-3.5 py-2 rounded-xl border bg-card/80 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                missingFlags.place ? 'border-amber-500/70' : 'border-line'
              }`}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-line">
          <button
            type="submit"
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:opacity-95 transition-opacity"
          >
            <Send className="w-4 h-4" />
            Post to Rescue Network
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl glass-chip border border-line text-xs font-medium text-mute hover:text-ink transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Re-enter Text
          </button>
        </div>

        <p className="text-[11px] text-mute text-center pt-1">
          SurplusLink AI extracts details from your message. Safety and freshness must be verified by the donor before posting.
        </p>
      </form>
    </motion.div>
  );
};
