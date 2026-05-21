'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BoardSnapshot, Pin } from '@/lib/device-simulator';
import { getPanelUrl } from '@/lib/panel-url';
import { BoardStage } from './components/board/BoardStage';
import { SensorCards } from './components/board/SensorCards';
import { EventLog } from './components/board/EventLog';
import styles from './board.module.css';

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

export default function BoardPage() {
  const [snapshot, setSnapshot] = useState<BoardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelUrl = getPanelUrl();

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/state?limit=30');
      if (!response.ok) {
        throw new Error('Failed to load board state');
      }
      const data = (await response.json()) as BoardSnapshot;
      setSnapshot(data);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    fetchState();
    const timer = window.setInterval(fetchState, 500);
    return () => window.clearInterval(timer);
  }, [fetchState]);

  const togglePin = async (pin: Pin) => {
    if (pin.mode !== 'output') {
      return;
    }
    const nextState = pin.state === 'high' ? 'low' : 'high';
    await fetch(`/api/v1/pins/${pin.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'output', state: nextState }),
    });
    fetchState();
  };

  const blinkLed = async () => {
    await fetch('/api/v1/actions/blink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ times: 3, interval_ms: 200 }),
    });
    fetchState();
  };

  const resetBoard = async () => {
    await fetch('/api/v1/actions/reset', { method: 'POST' });
    fetchState();
  };

  const board = snapshot?.board;
  const config = snapshot?.config;
  const ledPin = snapshot?.pins.find((pin) => pin.id === 1);

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <img src="/assets/uigen-hardware-logo.svg" alt="" width={48} height={48} className={styles.logo} />
          <div>
            <p className={styles.eyebrow}>UIGen Hardware Demo</p>
            <h1>UIGen DevBoard</h1>
          </div>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.btnPrimary} onClick={blinkLed}>
            Blink LED
          </button>
          <button type="button" className={styles.btnSecondary} onClick={resetBoard}>
            Reset Board
          </button>
          <a className={styles.btnGhost} href={panelUrl} target="_blank" rel="noreferrer">
            Control Panel
          </a>
          <a className={styles.btnGhost} href="/openapi.yaml" target="_blank" rel="noreferrer">
            OpenAPI
          </a>
        </div>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.statusStrip}>
        <article className={styles.statusCard}>
          <span>Chip</span>
          <strong>{board?.chip ?? '--'}</strong>
        </article>
        <article className={styles.statusCard}>
          <span>Uptime</span>
          <strong>{board ? formatUptime(board.uptime_seconds) : '--'}</strong>
        </article>
        <article className={styles.statusCard}>
          <span>Free Memory</span>
          <strong>{board ? formatBytes(board.free_memory_bytes) : '--'}</strong>
        </article>
        <article className={styles.statusCard}>
          <span>Network</span>
          <strong>
            {board?.network_connected
              ? `${board.network_ssid} (${board.network_rssi} dBm)`
              : 'Disconnected'}
          </strong>
        </article>
        <article className={styles.statusCard}>
          <span>Telemetry</span>
          <strong>{config ? `${config.telemetry_interval_ms} ms` : '--'}</strong>
        </article>
      </section>

      <main className={styles.layout}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Board Visualizer</h2>
              <p>Quad-zone DevBoard layout. Click output pins to toggle the status LED rail.</p>
            </div>
            <div className={styles.legend}>
              <span><i className={`${styles.dot} ${styles.output}`} /> Output</span>
              <span><i className={`${styles.dot} ${styles.input}`} /> Input</span>
              <span><i className={`${styles.dot} ${styles.analog}`} /> Analog</span>
              <span><i className={`${styles.dot} ${styles.high}`} /> HIGH</span>
            </div>
          </div>
          {snapshot && (
            <BoardStage
              snapshot={snapshot}
              ledOn={ledPin?.state === 'high'}
              blinking={snapshot.blinking}
              onTogglePin={togglePin}
            />
          )}
        </section>

        <aside className={styles.sideColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Live Sensors</h2>
              <p>Ambient, humidity, rail voltage, and die temperature.</p>
            </div>
            {snapshot && <SensorCards sensors={snapshot.sensors} />}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Event Log</h2>
              <p>Pin toggles, telemetry, alerts, and actions.</p>
            </div>
            {snapshot && <EventLog events={snapshot.events} />}
          </section>
        </aside>
      </main>
    </div>
  );
}
