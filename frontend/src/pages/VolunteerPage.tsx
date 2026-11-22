import React, { useState } from 'react';
import { Bike, LogIn, CheckCircle2 } from 'lucide-react';
import { PickupQueue } from '../components/volunteer/PickupQueue';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/auth/AuthModal';

interface VolunteerPageProps {
  onNavigateToNgo?: () => void;
}

export const VolunteerPage: React.FC<VolunteerPageProps> = ({ onNavigateToNgo }) => {
  const { user, isVolunteer } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Bike className="w-3.5 h-3.5" /> For Volunteers & Riders
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-1">
            Surplus Pickup Queue
          </h2>
          <p className="text-sm text-mute max-w-xl mt-1">
            Claim an accepted pickup, view route details, and receive a secure single-use handover QR token valid for two hours.
          </p>
        </div>

        {isVolunteer && user ? (
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center gap-3 shrink-0">
            <div className="text-2xl">{user.avatar || '🛵'}</div>
            <div>
              <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                {user.name}
              </div>
              <div className="text-[11px] text-mute font-mono">Courier ID #42 • Ready for Dispatch</div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-card/80 border border-line hover:border-primary/50 text-xs font-bold text-ink shadow-sm transition-all shrink-0 self-start sm:self-auto"
          >
            <LogIn className="w-4 h-4 text-primary" />
            <span>Sign in as Volunteer Rider</span>
          </button>
        )}
      </div>

      {/* Pickup Queue Content */}
      <PickupQueue onNavigateToNgo={onNavigateToNgo} />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultRole="volunteer"
      />
    </div>
  );
};
