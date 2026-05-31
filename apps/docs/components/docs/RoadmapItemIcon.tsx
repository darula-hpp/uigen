import { CircleCheck, Circle } from 'lucide-react';

interface RoadmapItemIconProps {
  done: boolean;
  className?: string;
}

export function RoadmapItemIcon({ done, className = 'h-4 w-4 shrink-0' }: RoadmapItemIconProps) {
  if (done) {
    return (
      <CircleCheck
        className={`${className} text-[var(--primary)]`}
        aria-hidden="true"
      />
    );
  }

  return (
    <Circle
      className={`${className} text-gray-300 dark:text-gray-600`}
      aria-hidden="true"
    />
  );
}
