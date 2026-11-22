import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Radio, Users, Sparkles, Smartphone, Laptop, Building2 } from 'lucide-react';
import { useRescue } from '../../context/RescueContext';
import { useToast } from '../../context/ToastContext';

interface LiveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveSessionModal: React.FC<LiveSessionModalProps> = ({ isOpen, onClose }) => {
  const { joinCode, setJoinCode, isBackendLive, backendInfo } = useRescue();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(joinCode);
    setCopied(true);
    showToast(`Join code ${joinCode} copied to clipboard!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (customCode.trim().length >= 4) {
      const formatted = customCode.trim().toUpperCase();
      setJoinCode(formatted);
      setIsEditing(false);
      setCustomCode('');
      showToast(`Active session switched to ${formatted}`, 'info');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl bg-card border border-line z-10 space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-lg sm:text-xl text-ink">Live Rescue Session</h3>
                  <p className="text-xs text-mute">Multi-device real-time coordination room</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-chip hover:bg-mute/20 text-mute hover:text-ink flex items-center justify-center transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Join Code Display Box */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-primary/10 to-transparent border border-primary/20 text-center space-y-3">
              <span className="text-xs uppercase tracking-wider font-mono text-mute font-medium">
                Session Join Code
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-widest text-primary drop-shadow-sm">
                {joinCode}
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow hover:opacity-95 transition-opacity"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Code'}
                </button>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3 py-2 rounded-xl glass-chip text-xs font-medium text-mute hover:text-ink transition-colors"
                >
                  {isEditing ? 'Cancel' : 'Change Code'}
                </button>
              </div>

              {isEditing && (
                <form onSubmit={handleApplyCode} className="flex gap-2 pt-2 max-w-xs mx-auto">
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. RESCUE-9X2Y"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-line bg-card text-xs font-mono text-ink placeholder:text-mute focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
                  >
                    Join
                  </button>
                </form>
              )}
            </div>

            {/* How Multi-Device Sync Works */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-mute flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-primary" />
                Cross-Device Workflow
              </h4>
              <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                <div className="p-3 rounded-xl bg-chip/60 border border-line space-y-1">
                  <Laptop className="w-5 h-5 mx-auto text-emerald-600 dark:text-emerald-400" />
                  <div className="font-semibold text-ink">1. Donor</div>
                  <div className="text-[11px] text-mute">Creates listing on desktop / laptop</div>
                </div>
                <div className="p-3 rounded-xl bg-chip/60 border border-line space-y-1">
                  <Building2 className="w-5 h-5 mx-auto text-blue-600 dark:text-blue-400" />
                  <div className="font-semibold text-ink">2. Recipient NGO</div>
                  <div className="text-[11px] text-mute">Accepts match at front desk</div>
                </div>
                <div className="p-3 rounded-xl bg-chip/60 border border-line space-y-1">
                  <Smartphone className="w-5 h-5 mx-auto text-amber-600 dark:text-amber-400" />
                  <div className="font-semibold text-ink">3. Volunteer</div>
                  <div className="text-[11px] text-mute">Tracks delivery on mobile phone</div>
                </div>
              </div>
            </div>

            {/* Engine Status Banner */}
            <div className="p-3 rounded-xl bg-chip/40 border border-line flex items-center justify-between text-xs text-mute">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isBackendLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>Engine: {backendInfo?.service || 'SurplusLink Smart Local Fallback'}</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Live Sync Active
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
