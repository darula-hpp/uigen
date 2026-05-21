'use client';

import type { SensorSnapshot } from '@/lib/device-simulator';
import styles from '../../board.module.css';

function sparklinePoints(values: number[], width: number, height: number): string {
  if (values.length === 0) {
    return '';
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');
}

export function SensorCards({ sensors }: { sensors: SensorSnapshot[] }) {
  return (
    <div className={styles.sensorGrid}>
      {sensors.map(({ sensor, latest_reading, recent_readings }) => {
        const values = recent_readings.map((reading) => reading.value);
        const latest = latest_reading?.value;

        return (
          <article key={sensor.id} className={styles.sensorCard}>
            <header>
              <h3>{sensor.name}</h3>
              <span>{sensor.type}</span>
            </header>
            <p className={styles.sensorValue}>
              {latest !== undefined ? `${latest.toFixed(1)} ${sensor.unit}` : '--'}
            </p>
            <svg viewBox="0 0 120 36" className={styles.sparkline} aria-hidden="true">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                points={sparklinePoints(values, 120, 36)}
              />
            </svg>
          </article>
        );
      })}
    </div>
  );
}
