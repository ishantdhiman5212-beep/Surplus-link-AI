import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { useRescue } from '../../context/RescueContext';
import { useToast } from '../../context/ToastContext';
import { NGOS } from '../../services/mockData';

interface HandoverDeskProps {
  activeNgoId: string;
}

export const HandoverDesk: React.FC<HandoverDeskProps> = ({ activeNgoId }) => {
  const { verifyHandoverCode } = useRescue();
  const { showToast, triggerConfetti } = useToast();

  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (cleanCode.length < 6) {
      setFeedback({
        success: false,
        message: 'Enter the full handover token shown by the volunteer.',
      });
      return;
    }

    const result = await verifyHandoverCode(cleanCode, activeNgoId);
    setFeedback(result);

    if (result.success) {
      triggerConfetti();
      showToast('Handover confirmed and food rescued!', 'success');
      setCode('');
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase().slice(0, 24));
    if (feedback) setFeedback(null);
  };

  return (
    <div className="p-6 sm:p-7 rounded-2xl glass-panel border border-line bg-card/80 shadow-glass space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg text-ink">Handover Verification Desk</h3>
            <p className="text-xs text-mute">
              Volunteer arrives with a QR token. Scan or paste the token to confirm custody.
            </p>
          </div>
        </div>
        {activeNgoId && NGOS[activeNgoId] && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary shrink-0 self-start sm:self-auto">
            <span>{NGOS[activeNgoId].avatar || '🏢'}</span>
            <span>Desk: {NGOS[activeNgoId].name}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <label htmlFor="desk-code" className="block text-xs font-bold uppercase tracking-wider text-mute">
            One-Time Handover Token
          </label>
          <div className="relative">
            <input
              id="desk-code"
              type="text"
              inputMode="text"
              maxLength={24}
              value={code}
              onChange={handleInputChange}
              placeholder="SL-12-AB12CD34"
              className="w-full px-4 py-3 rounded-xl border border-line bg-card text-center font-mono text-lg font-bold tracking-wider text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-inner"
            />
            <Lock className="w-4 h-4 text-mute/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <button
          type="submit"
          disabled={code.trim().length < 6}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ShieldCheck className="w-4 h-4" />
          Verify Handover
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Verification Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed transition-all ${
            feedback.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-bold text-sm mb-0.5">
              {feedback.success ? 'Verification Successful' : 'Verification Unsuccessful'}
            </div>
            <div>{feedback.message}</div>
          </div>
        </div>
      )}
    </div>
  );
};
