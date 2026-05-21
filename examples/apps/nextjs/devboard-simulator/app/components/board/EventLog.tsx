'use client';

import type { SimulationEvent } from '@/lib/device-simulator';
import styles from '../../board.module.css';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function EventLog({ events }: { events: SimulationEvent[] }) {
  const recent = [...events].reverse().slice(0, 20);

  return (
    <ul className={styles.eventLog}>
      {recent.map((event) => (
        <li key={event.id}>
          <span className={styles.eventTime}>{formatTime(event.recorded_at)}</span>
          <span className={styles.eventType}>{event.type}</span>
          <span>{event.message}</span>
        </li>
      ))}
    </ul>
  );
}
