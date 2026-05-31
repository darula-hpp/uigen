import { roadmapPhases, roadmapPriorities } from '../../lib/roadmap-data';
import { RoadmapItemIcon } from './RoadmapItemIcon';
import { RoadmapStatusBadge } from './RoadmapStatusBadge';

export function RoadmapPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-semibold tracking-tight mb-4">Roadmap</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
        UIGen is developed in phases. Here&apos;s what&apos;s been shipped and what&apos;s
        coming next.
      </p>

      <div className="space-y-12">
        {roadmapPhases.map((phase) => (
          <section key={phase.title}>
            <div className="flex flex-wrap items-center gap-3 mb-5 pb-3 border-b border-[var(--border)]">
              <h2 className="text-2xl font-semibold m-0">{phase.title}</h2>
              <RoadmapStatusBadge status={phase.status} />
            </div>
            <ul className="space-y-3 list-none p-0 m-0">
              {phase.items.map((item) => (
                <li key={item.label} className="flex items-start gap-3 text-sm leading-relaxed">
                  <RoadmapItemIcon done={item.done} className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className={item.done ? '' : 'text-gray-500 dark:text-gray-400'}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section>
          <h2 className="text-2xl font-semibold mb-5 pb-3 border-b border-[var(--border)]">
            Current priorities
          </h2>
          <ul className="space-y-3 list-none p-0 m-0">
            {roadmapPriorities.map((priority) => (
              <li key={priority} className="flex items-start gap-3 text-sm leading-relaxed">
                <RoadmapItemIcon done={false} className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="text-gray-600 dark:text-gray-400">{priority}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
