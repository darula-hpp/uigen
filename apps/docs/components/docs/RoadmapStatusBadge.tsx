import { CheckCircle2, CircleDot, Circle } from 'lucide-react';
import type { RoadmapPhaseStatus } from '../../lib/roadmap-data';

const statusConfig: Record<
  RoadmapPhaseStatus,
  { label: string; Icon: typeof CheckCircle2; className: string }
> = {
  complete: {
    label: 'Complete',
    Icon: CheckCircle2,
    className: 'text-[var(--primary)] bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900/60',
  },
  'in-progress': {
    label: 'In progress',
    Icon: CircleDot,
    className: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50',
  },
  planned: {
    label: 'Planned',
    Icon: Circle,
    className: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 border-[var(--border)]',
  },
};

export function RoadmapStatusBadge({ status }: { status: RoadmapPhaseStatus }) {
  const { label, Icon, className } = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
