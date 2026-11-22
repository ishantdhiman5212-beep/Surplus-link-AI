import React from 'react';
import { ArrowRight, Building2, Bike } from 'lucide-react';
import { useRescue } from '../context/RescueContext';
import { FoodListing, ActivityFeedItem } from '../types';

interface HomePageProps {
  onNavigate: (tab: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { listings, stats, feed } = useRescue();

  const openListings = listings.filter((l: FoodListing) => l.status === 'open');

  const steps = [
    {
      num: 1,
      title: 'List it',
      desc: 'Type it like a casual text message. 3-tier AI extracts and structures the listing.',
    },
    {
      num: 2,
      title: 'AI Matches',
      desc: 'NGOs ranked in real-time by distance, room and time, with reasons.',
    },
    {
      num: 3,
      title: 'NGO Accepts',
      desc: 'One tap, and everyone sees it right away.',
    },
    {
      num: 4,
      title: 'Volunteer Picks Up',
      desc: 'Start the pickup and get a single-use handover QR token valid for two hours.',
    },
    {
      num: 5,
      title: 'Token Verifies',
      desc: 'The NGO scans or enters it on arrival. Used tokens are rejected.',
    },
  ];

  return (
    <div className="space-y-14 pb-16">
      {/* Hero Section */}
      <section className="relative pt-4 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/75 dark:bg-card/75 backdrop-blur-md border border-line text-xs font-semibold text-ink shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {openListings.length > 0
                  ? `${openListings.length} donation${openListings.length > 1 ? 's' : ''} open now`
                  : '1 donation open now'}
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-ink leading-[1.05]">
              Good food <br />
              shouldn't end <br />
              up in the bin.
            </h1>

            <p className="text-base sm:text-lg text-mute max-w-xl leading-relaxed">
              SurplusLink AI connects donors, NGOs and volunteers so surplus meals reach people in hours, not landfills.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('donate')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-primary text-white font-bold text-sm shadow-md hover:opacity-95 hover:scale-[1.02] transition-all"
              >
                Donate food
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('ngos')}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/75 dark:bg-card/75 border border-line hover:bg-white text-ink font-semibold text-sm shadow-sm transition-all"
              >
                <Building2 className="w-4 h-4 text-primary" />
                I'm an NGO
              </button>
              <button
                onClick={() => onNavigate('volunteer')}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/75 dark:bg-card/75 border border-line hover:bg-white text-ink font-semibold text-sm shadow-sm transition-all"
              >
                <Bike className="w-4 h-4 text-primary" />
                Volunteer
              </button>
            </div>
          </div>

          {/* Hero Right: Exact Terracotta Sunset Stat Card with 3 Floating Badges */}
          <div className="lg:col-span-5 relative mt-4 lg:mt-0">
            {/* Floating Badge 1 (Top Left) */}
            <div className="absolute -top-3.5 -left-2 sm:-left-4 z-20 bg-white/90 dark:bg-card/90 backdrop-blur-md border border-line shadow-md px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold text-ink pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Rice & dal • 30 kg</span>
            </div>

            {/* Floating Badge 2 (Middle Right) */}
            <div className="absolute top-1/2 -right-2 sm:-right-6 -translate-y-1/2 z-20 bg-white/90 dark:bg-card/90 backdrop-blur-md border border-line shadow-md px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold text-ink pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Matched to nearest NGO</span>
            </div>

            {/* Floating Badge 3 (Bottom Left) */}
            <div className="absolute -bottom-3 left-3 sm:left-5 z-20 bg-white/90 dark:bg-card/90 backdrop-blur-md border border-line shadow-md px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold text-ink pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Handover code verified</span>
            </div>

            {/* Main Light Orange Gradient Card */}
            <div
              className="rounded-3xl p-7 sm:p-8 shadow-2xl border border-white/30 text-white space-y-6 relative overflow-hidden backdrop-blur-xl"
              style={{
                background: 'linear-gradient(135deg, #FFA06E 0%, #FA8252 45%, #F36D3B 100%)',
                boxShadow: '0 20px 45px -12px rgba(243, 109, 59, 0.38), 0 2px 6px rgba(42, 22, 18, 0.06)',
              }}
            >
              <div className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                Rescued so far
              </div>

              <div>
                <div className="flex items-baseline">
                  <span className="text-6xl sm:text-7xl font-extrabold font-mono text-white tracking-tight drop-shadow-sm">
                    {stats.rescuedKg}
                  </span>
                  <span className="text-2xl font-bold text-white/90 ml-1">kg</span>
                </div>
                <div className="text-sm font-medium text-white/90 mt-1">
                  ≈ {stats.mealsShared} meals shared
                </div>
              </div>

              {/* Top Match Inner Box */}
              <div className="bg-black/15 backdrop-blur-md border border-white/20 rounded-2xl p-4 space-y-1.5">
                <span className="text-xs text-white/80 font-medium block">
                  Top match
                </span>
                <div className="font-bold text-base text-white">
                  Sewa Community Kitchen • 89
                </div>
                <div className="text-xs text-white/80">
                  Nearby • Partial capacity use • Pickup in time
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ticker Banner */}
      <section className="rounded-2xl py-3 px-4 border border-line bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
        <div className="animate-marquee gap-8 text-xs font-mono text-mute items-center">
          <span className="font-bold text-primary">● 12 kg rescued so far</span>
          <span className="text-ink">● Spice Route Restaurant listed 40 plates veg biryani & raita</span>
          <span className="text-ink">● Sewa Community Kitchen accepted 25 kg from College Canteen Block C</span>
          <span className="text-ink">● Sharma Wedding Events handed over 12 kg to Roti Bank Foundation</span>
          {feed.slice(0, 3).map((f: ActivityFeedItem) => (
            <span key={f.id} className="text-ink">
              ● {f.text}
            </span>
          ))}
          <span className="font-bold text-primary">● 1 kg ≈ 2.5 meals ≈ 2.5 kg CO₂</span>
        </div>
      </section>

      {/* How It Works (5 Steps) */}
      <section className="space-y-6 pt-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">How it works</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-1">
            From leftover to lunch in five steps.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className="p-5 rounded-2xl glass-panel border border-line bg-card/70 space-y-3 hover:border-primary/40 transition-all group"
            >
              <div className="w-8 h-8 rounded-xl bg-primary text-white font-mono font-bold flex items-center justify-center text-sm shadow-sm">
                {step.num}
              </div>
              <h3 className="font-bold text-base text-ink">{step.title}</h3>
              <p className="text-xs text-mute leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
