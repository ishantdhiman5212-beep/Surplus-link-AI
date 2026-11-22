import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Bike, ShieldAlert, HeartHandshake, CheckCircle2, ArrowRight, Sparkles, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRescue } from '../../context/RescueContext';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';
import { NGOS } from '../../services/mockData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultRole = 'ngo' }) => {
  const { login, loginAsPreset } = useAuth();
  const { setActiveNgo } = useRescue();
  const { showToast, triggerConfetti } = useToast();

  const [activeTab, setActiveTab] = useState<UserRole>(defaultRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('roti');
  const [isLoading, setIsLoading] = useState(false);

  const roleConfigs = {
    ngo: {
      label: 'NGO Partner',
      icon: Building2,
      badge: 'Recipient Front Desk',
      description: 'Review match scores, accept surplus batches, and verify one-time volunteer handover QR tokens.',
      presetKey: selectedOrgId === 'roti' ? 'ngo_roti' : selectedOrgId === 'sewa' ? 'ngo_sewa' : 'ngo_anna',
      defaultEmail: 'roti@rotibank.org',
    },
    volunteer: {
      label: 'Volunteer Rider',
      icon: Bike,
      badge: 'Courier Logistics',
      description: 'Claim available pickups, view route waypoints, and receive two-hour single-use handover QR tokens.',
      presetKey: 'vol_arjun',
      defaultEmail: 'rider.arjun@surpluslink.org',
    },
    admin: {
      label: 'Platform Admin',
      icon: ShieldAlert,
      badge: 'City Network Dispatch',
      description: 'Monitor global donation streams, override statuses, inspect AI health, and audit logs.',
      presetKey: 'admin_lead',
      defaultEmail: 'admin@surpluslink.ai',
    },
    donor: {
      label: 'Food Donor',
      icon: HeartHandshake,
      badge: 'Kitchen Manager',
      description: 'Post free-text surplus meals, verify 3-tier AI extractions, and launch live rescue rooms.',
      presetKey: 'donor_spice',
      defaultEmail: 'chef@spiceroute.com',
    },
  };

  const handleQuickLogin = async (presetKey: string) => {
    try {
      const user = await loginAsPreset(presetKey);
      if (user.role === 'ngo' && user.organisationId) {
        setActiveNgo(user.organisationId);
      }
      triggerConfetti();
      showToast(`Signed in as ${user.name} (${user.role.toUpperCase()})`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Demo sign-in failed. Start the FastAPI backend first.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const user = await login({
        email,
        password,
        role: activeTab,
        organisationId: activeTab === 'ngo' ? selectedOrgId : undefined,
      });

      if (user.role === 'ngo' && user.organisationId) {
        setActiveNgo(user.organisationId);
      }

      triggerConfetti();
      showToast(`Welcome back, ${user.name}!`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Authentication failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const currentConfig = roleConfigs[activeTab];
  const IconComponent = currentConfig.icon;

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

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl bg-card border border-line z-10 space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shadow-inner">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg sm:text-xl text-ink">Sign In to SurplusLink</h3>
                  <p className="text-xs text-mute">{currentConfig.badge}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-chip hover:bg-mute/20 text-mute hover:text-ink flex items-center justify-center transition-colors"
                aria-label="Close authentication modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Role Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-chip/60 border border-line">
              {(['ngo', 'volunteer', 'admin', 'donor'] as UserRole[]).map((role) => {
                const conf = roleConfigs[role];
                const TabIcon = conf.icon;
                const active = activeTab === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setActiveTab(role);
                      setEmail(conf.defaultEmail);
                    }}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-card text-ink shadow-sm border border-line font-bold'
                        : 'text-mute hover:text-ink hover:bg-card/40'
                    }`}
                  >
                    <TabIcon className={`w-4 h-4 mb-1 ${active ? 'text-primary' : 'text-mute'}`} />
                    <span className="truncate text-[11px]">{conf.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Role Mission Description */}
            <div className="p-3.5 rounded-2xl bg-primary-soft/60 border border-primary/20 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-ink/90 leading-relaxed">
                {currentConfig.description}
              </p>
            </div>

            {/* One-Click Quick Demo Sign In */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-mute">
                  Instant Demo Access
                </span>
                <span className="text-[10px] text-primary font-semibold font-mono">No Password Needed</span>
              </div>

              {activeTab === 'ngo' ? (
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(NGOS).map(([key, ngo]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleQuickLogin(key === 'roti' ? 'ngo_roti' : key === 'sewa' ? 'ngo_sewa' : 'ngo_anna')}
                      className="p-2.5 rounded-xl border border-line glass-chip hover:bg-card hover:border-primary/50 text-left transition-all group"
                    >
                      <div className="text-base mb-1">{ngo.avatar}</div>
                      <div className="font-bold text-[11px] text-ink truncate group-hover:text-primary">
                        {ngo.name.split(' ')[0]}
                      </div>
                      <div className="text-[10px] text-mute">{ngo.cap} kg cap</div>
                    </button>
                  ))}
                </div>
              ) : activeTab === 'volunteer' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('vol_arjun')}
                    className="p-3 rounded-xl border border-line glass-chip hover:bg-card hover:border-primary/50 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🛵</span>
                      <span className="font-bold text-xs text-ink group-hover:text-primary">Arjun Verma</span>
                    </div>
                    <div className="text-[10px] text-mute">E-Scooter Courier (Rider #42)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('vol_priya')}
                    className="p-3 rounded-xl border border-line glass-chip hover:bg-card hover:border-primary/50 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🚴</span>
                      <span className="font-bold text-xs text-ink group-hover:text-primary">Priya Sharma</span>
                    </div>
                    <div className="text-[10px] text-mute">Cargo Runner (Express)</div>
                  </button>
                </div>
              ) : activeTab === 'admin' ? (
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin_lead')}
                  className="w-full p-3.5 rounded-xl border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-amber-500/10 to-transparent hover:border-primary text-left flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🛡️</span>
                    <div>
                      <div className="font-bold text-xs text-ink group-hover:text-primary">
                        Sign In as Platform Dispatch Admin
                      </div>
                      <div className="text-[11px] text-mute">Full Network Oversight & Simulation Controls</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleQuickLogin('donor_spice')}
                  className="w-full p-3.5 rounded-xl border border-line glass-chip hover:bg-card hover:border-primary/50 text-left flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">👨‍🍳</span>
                    <div>
                      <div className="font-bold text-xs text-ink group-hover:text-primary">
                        Chef Rajesh Kumar (Spice Route)
                      </div>
                      <div className="text-[11px] text-mute">Restaurant Surplus Food Donor</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 text-xs text-mute/80">
              <div className="h-px bg-line flex-1" />
              <span>or enter credentials</span>
              <div className="h-px bg-line flex-1" />
            </div>

            {/* Standard Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {activeTab === 'ngo' && (
                <div className="space-y-1">
                  <label htmlFor="auth-org" className="block text-xs font-semibold text-ink">
                    Recipient Organization
                  </label>
                  <select
                    id="auth-org"
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-card/80 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {Object.entries(NGOS).map(([key, ngo]) => (
                      <option key={key} value={key}>
                        {ngo.name} ({ngo.cap} kg cap)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="auth-email" className="block text-xs font-semibold text-ink">
                  Account Email
                </label>
                <div className="relative">
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={currentConfig.defaultEmail}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-line bg-card/80 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                  <Mail className="w-3.5 h-3.5 text-mute/60 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="auth-pw" className="block text-xs font-semibold text-ink">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="auth-pw"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-line bg-card/80 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <Lock className="w-3.5 h-3.5 text-mute/60 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold shadow hover:opacity-95 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isLoading ? 'Verifying...' : `Sign In as ${currentConfig.label}`}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
