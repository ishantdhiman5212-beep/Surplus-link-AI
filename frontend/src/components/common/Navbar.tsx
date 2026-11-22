import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  Sprout,
  Home,
  HeartHandshake,
  Building2,
  Bike,
  BarChart3,
  LogIn,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useRescue } from '../../context/RescueContext';
import { useAuth } from '../../context/AuthContext';
import { LiveSessionModal } from '../session/LiveSessionModal';
import { AuthModal } from '../auth/AuthModal';
import { AdminModal } from '../admin/AdminModal';
import { UserRole } from '../../types';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange }) => {
  const { isDark, toggleTheme } = useTheme();
  const { joinCode, stats, isBackendLive } = useRescue();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState<UserRole>('ngo');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'donate', label: 'Donate', icon: HeartHandshake },
    { id: 'ngos', label: 'NGOs', icon: Building2 },
    { id: 'volunteer', label: 'Volunteer', icon: Bike },
    { id: 'impact', label: 'Impact', icon: BarChart3 },
  ];

  const roleBadgeColors: Record<UserRole, string> = {
    ngo: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
    volunteer: 'bg-blue-500/15 text-blue-600 border-blue-500/25',
    admin: 'bg-primary/15 text-primary border-primary/25',
    donor: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-line bg-card/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand */}
          <button
            onClick={() => onTabChange('home')}
            className="flex items-center gap-2.5 text-left group focus:outline-none shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Sprout className="w-5 h-5" />
            </div>
            <div className="flex items-center">
              <span className="font-extrabold text-lg tracking-tight text-ink">
                SurplusLink <span className="text-primary italic font-semibold">AI</span>
              </span>
            </div>
          </button>

          {/* Centered Capsule Navigation Dock */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-white/70 dark:bg-card/70 border border-line shadow-sm backdrop-blur-md">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    active
                      ? 'bg-white dark:bg-card text-ink shadow-sm font-semibold border border-line/60'
                      : 'text-mute hover:text-ink hover:bg-white/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.id === 'donate' && stats.activeOpen > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-primary/15 text-primary font-bold">
                      {stats.activeOpen}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Admin Console Trigger (when signed in as Admin) */}
            {isAdmin && (
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary hover:text-white text-primary border border-primary/20 text-xs font-bold transition-all shadow-sm"
                title="Open Platform Dispatch Admin Console"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </button>
            )}

            {/* Auth / User Pill */}
            {isAuthenticated && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/80 dark:bg-card/80 border border-line text-xs font-medium hover:border-primary/40 transition-colors text-ink shadow-sm"
                  aria-expanded={isUserMenuOpen}
                >
                  <span className="text-base leading-none">{user.avatar || '👤'}</span>
                  <span className="font-bold text-ink max-w-[80px] sm:max-w-[110px] truncate text-left">
                    {user.name}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border ${
                      roleBadgeColors[user.role]
                    }`}
                  >
                    {user.role}
                  </span>
                  <ChevronDown className="w-3 h-3 text-mute" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl glass-panel bg-card border border-line shadow-2xl p-2 z-50 space-y-1 text-xs">
                    <div className="p-2.5 border-b border-line/60">
                      <div className="font-bold text-ink flex items-center justify-between">
                        <span>{user.name}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold border ${roleBadgeColors[user.role]}`}>
                          {user.role}
                        </span>
                      </div>
                      <div className="text-mute text-[11px] truncate mt-0.5">{user.email}</div>
                      {user.organisationName && (
                        <div className="text-[11px] text-primary font-semibold mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {user.organisationName}
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsAdminModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-bold text-primary hover:bg-primary-soft transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Admin Dispatch Console
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-ink hover:bg-chip transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-primary" />
                      Switch Role (NGO / Volunteer / Admin)
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-red-500 hover:bg-red-500/10 font-semibold transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthDefaultRole('ngo');
                  setIsAuthModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary hover:text-white text-primary border border-primary/25 text-xs font-bold transition-all shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Live Session Chip */}
            <button
              onClick={() => setIsSessionModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-card/80 border border-line text-xs font-mono font-medium hover:border-primary/40 transition-colors text-ink shadow-sm"
              title="Open Live Rescue Session Room"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-mute text-[11px] hidden sm:inline">Live</span>
              <span className="font-bold text-ink">{joinCode.replace('RESCUE-', '')}</span>
            </button>

            {/* Backend Status Indicator */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border border-line bg-card/40 text-mute"
              title={isBackendLive ? 'Live backend connected' : 'Running in Smart Mock Fallback Mode'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isBackendLive ? 'bg-emerald-500' : 'bg-primary'}`} />
              <span>{isBackendLive ? 'API LIVE' : 'MOCK'}</span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl bg-white/80 dark:bg-card/80 border border-line flex items-center justify-center text-ink hover:bg-white transition-colors focus:outline-none shadow-sm"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-mute" />}
            </button>
          </div>
        </div>
      </header>

      {/* Live Session Modal */}
      <LiveSessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
      />

      {/* Auth Modal for NGO, Volunteer, Admin, Donor */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultRole={authDefaultRole}
      />

      {/* Platform Dispatch Admin Console */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
    </>
  );
};
