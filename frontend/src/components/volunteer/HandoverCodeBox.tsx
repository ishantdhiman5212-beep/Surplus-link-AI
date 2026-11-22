import React, { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw, Clock, KeyRound } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface HandoverCodeBoxProps {
  code: string;
  codeAt?: number | null;
  qrImage?: string | null;
  onRegenerate: () => void | Promise<void>;
}

const TOKEN_TTL_SECONDS = 2 * 60 * 60;

export const HandoverCodeBox: React.FC<HandoverCodeBoxProps> = ({
  code,
  codeAt,
  qrImage,
  onRegenerate,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(TOKEN_TTL_SECONDS);

  useEffect(() => {
    const updateCountdown = () => {
      if (!codeAt) {
        setSecondsRemaining(TOKEN_TTL_SECONDS);
        return;
      }
      const elapsedSeconds = Math.floor((Date.now() - codeAt) / 1000);
      setSecondsRemaining(Math.max(0, TOKEN_TTL_SECONDS - elapsedSeconds));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [codeAt]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    showToast('Handover token copied! Show the QR or read the token to the NGO desk.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpired = secondsRemaining <= 0;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const digits = code.split('');
  const isShortCode = digits.length === 6;

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-card to-primary/5 border border-primary/20 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mute">
          <KeyRound className="w-3.5 h-3.5 text-primary" />
          <span>One-Time Handover Token</span>
        </div>
        <div
          className={`flex items-center gap-1 font-mono text-xs ${
            isExpired ? 'text-rose-500 font-bold' : secondsRemaining < 600 ? 'text-amber-500 font-bold animate-pulse' : 'text-mute'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          {isExpired ? 'Token Expired' : `Expires in ${timeFormatted}`}
        </div>
      </div>

      {isShortCode ? (
        <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
          {digits.map((digit, idx) => (
            <div
              key={`${digit}-${idx}`}
              className="w-10 h-13 sm:w-12 sm:h-16 rounded-xl bg-card border-2 border-primary/40 shadow-sm flex items-center justify-center font-mono text-2xl sm:text-3xl font-extrabold text-primary"
            >
              {digit}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-card border-2 border-primary/40 text-center font-mono text-base sm:text-lg font-extrabold tracking-wider text-primary break-all">
          {code}
        </div>
      )}

      {qrImage && (
        <div className="flex justify-center">
          <img src={qrImage} alt="Handover QR code" className="h-36 w-36 rounded-xl bg-white p-2" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <p className="text-xs text-mute text-center sm:text-left max-w-xs">
          Show this QR or read the token to the NGO desk. Single use; valid for two hours.
        </p>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 shadow-sm transition-opacity"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={() => void onRegenerate()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-chip border border-line text-xs font-medium text-mute hover:text-ink transition-colors"
            title="Generate a replacement token"
          >
            <RefreshCw className="w-3 h-3" />
            New Token
          </button>
        </div>
      </div>
    </div>
  );
};
