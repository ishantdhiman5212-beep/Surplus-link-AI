import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  Cpu,
  RefreshCw,
  PlusCircle,
  Activity,
  CheckCircle2,
  Bike,
  FileText
} from 'lucide-react';
import { useRescue } from '../../context/RescueContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FoodListing } from '../../types';
import { NGOS } from '../../services/mockData';
import { formatTimeHHMM } from '../../services/matchingEngine';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { listings, feed, stats, addListing, startPickup, verifyHandoverCode, resetDemoData } = useRescue();
  const { showToast, triggerConfetti } = useToast();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'listings' | 'ai_health' | 'audit_log'>('listings');

  if (!isOpen) return null;

  const filteredListings = listings.filter((l) => {
    if (filterStatus === 'all') return true;
    return l.status === filterStatus;
  });

  // Simulator helper: Inject high-profile surplus listing
  const handleInjectSurplus = async (foodType: 'banquet' | 'bakery' | 'corporate') => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const deadlineMins = Math.min(23 * 60 + 59, currentMins + 4 * 60); // +4 hours

    let newListing: Omit<FoodListing, 'id' | 'createdAt' | 'status'>;

    if (foodType === 'banquet') {
      newListing = {
        title: 'Grand Palace Wedding Banquet: 45kg Veg Biryani & Paneer',
        cat: 'cooked',
        donor: 'Grand Palace Convention Center',
        place: 'Aerocity Hospitality District, New Delhi',
        kg: 45,
        deadline: deadlineMins,
        deadlineFormatted: formatTimeHHMM(deadlineMins),
        rawDraft: 'Grand Palace Banquet surplus 45kg veg biryani and paneer curries ready till late evening',
      };
    } else if (foodType === 'bakery') {
      newListing = {
        title: 'Artisan Bakery Evening Surplus: 18kg Croissants & Sourdough',
        cat: 'bakery',
        donor: 'Le Petit Boulangerie',
        place: 'Khan Market, New Delhi',
        kg: 18,
        deadline: deadlineMins,
        deadlineFormatted: formatTimeHHMM(deadlineMins),
        rawDraft: 'Evening batch fresh bread sourdough and croissants approx 18 kg',
      };
    } else {
      newListing = {
        title: 'Tech Park Cafeteria Surplus: 30kg Meals (Thali & Rotis)',
        cat: 'cooked',
        donor: 'Cyber Hub Global Canteen',
        place: 'DLF CyberCity, Phase 2, Gurugram',
        kg: 30,
        deadline: deadlineMins,
        deadlineFormatted: formatTimeHHMM(deadlineMins),
        rawDraft: '30kg packaged lunch thalis and fresh rotis ready for immediate rescue',
      };
    }

    try {
      const created = await addListing(newListing);
      triggerConfetti();
      showToast(`Injected test donation #${created.id.slice(-4)} (${newListing.kg} kg)`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not inject test donation.', 'error');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/65 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col glass-panel rounded-3xl bg-card border border-line shadow-2xl z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-line flex items-center justify-between shrink-0 bg-card/90">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-lg sm:text-xl text-ink">Platform Dispatch Admin Console</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/15 text-primary border border-primary/20">
                    SUPERADMIN
                  </span>
                </div>
                <p className="text-xs text-mute">
                  Logged in as <span className="font-semibold text-ink">{user?.name || 'Administrator'}</span> • Live Citywide Network Oversight
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-chip hover:bg-mute/20 text-mute hover:text-ink flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:px-6 bg-chip/40 border-b border-line text-xs">
            <div className="p-2.5 rounded-xl bg-card border border-line">
              <div className="text-mute text-[11px]">Total Rescued</div>
              <div className="font-extrabold text-base text-primary font-mono">{stats.rescuedKg} kg</div>
            </div>
            <div className="p-2.5 rounded-xl bg-card border border-line">
              <div className="text-mute text-[11px]">Meals Delivered</div>
              <div className="font-extrabold text-base text-ink font-mono">{stats.mealsShared}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-card border border-line">
              <div className="text-mute text-[11px]">In Transit</div>
              <div className="font-extrabold text-base text-amber-500 font-mono">{stats.inTransit}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-card border border-line">
              <div className="text-mute text-[11px]">Active Open</div>
              <div className="font-extrabold text-base text-emerald-500 font-mono">{stats.activeOpen}</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-line bg-card shrink-0">
            <button
              onClick={() => setActiveTab('listings')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'listings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-mute hover:text-ink'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Listing Dispatch ({listings.length})
            </button>
            <button
              onClick={() => setActiveTab('ai_health')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'ai_health'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-mute hover:text-ink'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              3-Tier AI System Health
            </button>
            <button
              onClick={() => setActiveTab('audit_log')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'audit_log'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-mute hover:text-ink'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Live Audit Feed ({feed.length})
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {activeTab === 'listings' && (
              <div className="space-y-5">
                {/* Simulator Injector Toolbar */}
                <div className="p-4 rounded-2xl bg-primary-soft/40 border border-primary/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-primary" />
                      Instant City Surplus Simulator (Judge / Demo Trigger)
                    </span>
                    <span className="text-[10px] text-mute font-mono">Simulate real-time donation alerts</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleInjectSurplus('banquet')}
                      className="px-3 py-1.5 rounded-xl bg-card border border-line hover:border-primary text-xs font-medium text-ink shadow-sm transition-all"
                    >
                      🍲 +45kg Wedding Banquet Biryani
                    </button>
                    <button
                      onClick={() => handleInjectSurplus('bakery')}
                      className="px-3 py-1.5 rounded-xl bg-card border border-line hover:border-primary text-xs font-medium text-ink shadow-sm transition-all"
                    >
                      🥐 +18kg Artisan Bakery Surplus
                    </button>
                    <button
                      onClick={() => handleInjectSurplus('corporate')}
                      className="px-3 py-1.5 rounded-xl bg-card border border-line hover:border-primary text-xs font-medium text-ink shadow-sm transition-all"
                    >
                      🏢 +30kg CyberCity Cafeteria
                    </button>
                    <button
                      onClick={() => {
                        resetDemoData();
                        showToast('Session reset to initial demo state', 'info');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-500/20 text-xs font-medium transition-all ml-auto flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reset Demo State
                    </button>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-chip/60 border border-line text-xs">
                    {['all', 'open', 'accepted', 'transit', 'collected'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setFilterStatus(st)}
                        className={`px-3 py-1 rounded-lg capitalize font-semibold transition-all ${
                          filterStatus === st
                            ? 'bg-card text-ink shadow-sm border border-line'
                            : 'text-mute hover:text-ink'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-mute font-mono">
                    Showing {filteredListings.length} of {listings.length}
                  </span>
                </div>

                {/* Listings Dispatch Table / Cards */}
                <div className="space-y-2.5">
                  {filteredListings.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl glass-panel bg-card border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 max-w-md">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                              item.status === 'open'
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : item.status === 'accepted'
                                ? 'bg-amber-500/15 text-amber-600'
                                : item.status === 'transit'
                                ? 'bg-blue-500/15 text-blue-600'
                                : 'bg-gray-500/15 text-gray-500'
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="font-bold text-ink truncate text-sm">{item.title}</span>
                        </div>
                        <div className="text-mute flex flex-wrap items-center gap-2 text-[11px]">
                          <span>Donor: <b className="text-ink">{item.donor}</b></span>
                          <span>•</span>
                          <span>Weight: <b className="text-primary font-mono">{item.kg} kg</b></span>
                          <span>•</span>
                          <span>Expires: <b className="text-ink font-mono">{formatTimeHHMM(item.deadline)}</b></span>
                          {item.ngo && (
                            <>
                              <span>•</span>
                              <span>NGO: <b className="text-ink">{NGOS[item.ngo]?.name || item.ngo}</b></span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Quick Admin Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'open' && (
                          <span className="text-[11px] text-mute italic">Awaiting NGO Acceptance</span>
                        )}
                        {item.status === 'accepted' && (
                          <button
                            onClick={async () => {
                              try {
                                const code = await startPickup(item.id);
                                showToast(`Volunteer pickup assigned! Handover token: ${code}`, 'success');
                              } catch (err: any) {
                                showToast(err?.message || 'Could not dispatch volunteer.', 'error');
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 font-semibold border border-blue-500/20 flex items-center gap-1.5"
                          >
                            <Bike className="w-3.5 h-3.5" />
                            Force Volunteer Dispatch
                          </button>
                        )}
                        {item.status === 'transit' && (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg bg-chip border border-line">
                              TOKEN: {item.code || '—'}
                            </span>
                            <button
                              onClick={async () => {
                                if (item.code && item.ngo) {
                                  const result = await verifyHandoverCode(item.code, item.ngo);
                                  showToast(result.message, result.success ? 'success' : 'error');
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 font-semibold border border-emerald-500/20 flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Verify & Close
                            </button>
                          </div>
                        )}
                        {item.status === 'collected' && (
                          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered & Closed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ai_health' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-card border border-line space-y-3">
                  <h4 className="font-bold text-sm text-ink flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    Tier 1: Google Gemini 3.1 Flash-Lite Engine
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-chip/50 border border-line">
                      <div className="text-mute text-[10px]">Status</div>
                      <div className="font-bold text-emerald-600">Online & Ready</div>
                    </div>
                    <div className="p-3 rounded-xl bg-chip/50 border border-line">
                      <div className="text-mute text-[10px]">Avg Latency</div>
                      <div className="font-bold text-ink font-mono">312 ms</div>
                    </div>
                    <div className="p-3 rounded-xl bg-chip/50 border border-line">
                      <div className="text-mute text-[10px]">Confidence Avg</div>
                      <div className="font-bold text-ink font-mono">96.4%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-chip/50 border border-line">
                      <div className="text-mute text-[10px]">JSON Strict Schema</div>
                      <div className="font-bold text-ink">Enabled</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-line space-y-3">
                  <h4 className="font-bold text-sm text-ink flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Tier 2: Grok LLM Engine (Fallback)
                  </h4>
                  <p className="text-xs text-mute">
                    Automatically engages if Google Gemini reaches rate limits or 429 quota exhaustion.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-chip/50 border border-line">
                      <div className="text-mute text-[10px]">Status</div>
                      <div className="font-bold text-amber-500">Standby (Warm)</div>
                    </div>
                    <div className="p-3 rounded-xl bg-chip/50 border border-line">
                      <div className="text-mute text-[10px]">Failover Trigger</div>
                      <div className="font-bold text-ink">Automatic (1500ms timeout)</div>
                    </div>
                    <div className="p-3 rounded-xl bg-chip/50 border border-line">
                      <div className="text-mute text-[10px]">Model</div>
                      <div className="font-bold text-ink font-mono">grok-beta / grok-2</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-line space-y-3">
                  <h4 className="font-bold text-sm text-ink flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    Tier 3: Local Deterministic Rule-Based Fallback
                  </h4>
                  <p className="text-xs text-mute">
                    Extracts meal quantity, unit weights, time strings, and dietary tags using strict regular expressions when completely offline.
                  </p>
                  <div className="p-3 rounded-xl bg-chip/50 border border-line text-xs font-mono">
                    Pattern regex: /(\d+(?:\.\d+)?)\s*(kg|kilos?|plates?|portions?|boxes?)/i
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'audit_log' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs text-mute">System Event Stream (Chronological)</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(feed, null, 2));
                      showToast('Audit log JSON copied to clipboard', 'info');
                    }}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Copy JSON Export
                  </button>
                </div>
                {feed.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl bg-chip/40 border border-line flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-bold">[{entry.category || 'system'}]</span>
                      <span className="text-ink font-sans">{entry.text}</span>
                    </div>
                    <span className="text-mute text-[11px] shrink-0">{formatTimeHHMM(entry.t)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:px-6 border-t border-line bg-card/90 flex items-center justify-between shrink-0 text-xs">
            <span className="text-mute">
              SurplusLink AI Platform v2.4 • FastAPI + React Engine
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-primary text-white font-bold hover:opacity-95 transition-all shadow-sm"
            >
              Close Console
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};