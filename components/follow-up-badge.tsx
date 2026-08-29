import { Check, Clock3, Minus } from 'lucide-react';
import type { FollowUpState } from '@/lib/event-types';
import { Badge } from '@/components/base-ui/badge';

export function FollowUpBadge({ state }: { state: FollowUpState }) {
  const config =
    state === 'done'
      ? {
          label: 'Sudah follow-up',
          icon: Check,
          variant: 'success' as const,
          className: 'border-emerald-500/20 bg-emerald-50 text-emerald-700',
        }
      : state === 'pending'
      ? {
          label: 'Belum follow-up',
          icon: Clock3,
          variant: 'warning' as const,
          className: 'border-amber-500/20 bg-amber-50 text-amber-700',
        }
      : {
          label: 'Tidak perlu',
          icon: Minus,
          variant: 'secondary' as const,
          className: 'border-slate-200 bg-slate-100/80 text-slate-600',
        };

  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-[11px] font-semibold ${config.className}`}
    >
      <Icon size={12} />
      {config.label}
    </Badge>
  );
}

