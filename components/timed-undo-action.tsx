'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, RotateCcw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';

export interface TimedUndoActionProps {
  initialSeconds?: number;
  deleteLabel?: string;
  undoLabel?: string;
  confirmLabel?: string;
  warningText?: string;
  onExecute: () => Promise<void> | void;
  onUndo?: () => void;
  className?: string;
}

export function TimedUndoAction({
  initialSeconds = 7,
  deleteLabel = 'Hapus Catatan',
  undoLabel = 'Batalkan Penghapusan',
  confirmLabel = 'Hapus Sekarang',
  warningText = 'Catatan akan dihapus permanen saat hitungan mundur selesai.',
  onExecute,
  onUndo,
  className = '',
}: TimedUndoActionProps) {
  const [isCounting, setIsCounting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isExecuting, setIsExecuting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleStartCount = () => {
    setIsCounting(true);
    setSecondsLeft(initialSeconds);

    // Decrement interval
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Final trigger timeout
    timerRef.current = setTimeout(async () => {
      setIsCounting(false);
      setIsExecuting(true);
      try {
        await onExecute();
      } finally {
        setIsExecuting(false);
      }
    }, initialSeconds * 1000);
  };

  const handleUndo = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsCounting(false);
    setSecondsLeft(initialSeconds);
    onUndo?.();
  };

  const handleInstantExecute = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsCounting(false);
    setIsExecuting(true);
    try {
      await onExecute();
    } finally {
      setIsExecuting(false);
    }
  };

  if (isExecuting) {
    return (
      <div className={`flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 animate-in fade-in ${className}`}>
        <Loader2 size={18} className="animate-spin text-red-600" />
        <span>Menghapus secara permanen...</span>
      </div>
    );
  }

  if (isCounting) {
    const progressPercent = ((initialSeconds - secondsLeft) / initialSeconds) * 100;
    const strokeDashoffset = 100 - progressPercent;

    return (
      <div className={`rounded-2xl border border-red-200 bg-red-50/80 p-4 text-red-950 shadow-xs backdrop-blur-xs animate-in zoom-in-95 duration-200 ${className}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Circular countdown progress */}
            <div className="relative grid h-11 w-11 shrink-0 place-items-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-red-200"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-red-600 transition-all duration-1000 ease-linear"
                  strokeDasharray="100, 100"
                  strokeDashoffset={strokeDashoffset}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-black text-red-800">
                {secondsLeft}s
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm text-red-900">
                <AlertCircle size={15} className="text-red-600" />
                <span>Menghapus dalam {secondsLeft} detik</span>
              </div>
              <p className="mt-0.5 text-xs text-red-700/80 leading-4">
                {warningText}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUndo}
            className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-100 active:scale-95"
            aria-label="Batalkan"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-red-200/60">
          <Button
            type="button"
            onClick={handleUndo}
            className="flex-1 bg-white border border-red-300 text-red-700 font-bold text-xs shadow-xs hover:bg-red-50 active:scale-95"
          >
            <RotateCcw size={14} className="mr-1.5" />
            {undoLabel}
          </Button>
          <Button
            type="button"
            onClick={handleInstantExecute}
            className="bg-red-600 text-white font-bold text-xs shadow-xs hover:bg-red-700 active:scale-95"
          >
            <Trash2 size={14} className="mr-1.5" />
            {confirmLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleStartCount}
      className={`border border-red-200 bg-red-50/70 text-red-600 shadow-xs hover:bg-red-100 hover:text-red-700 active:scale-95 transition-all ${className}`}
    >
      <Trash2 size={16} />
      <span>{deleteLabel}</span>
    </Button>
  );
}

export default TimedUndoAction;
