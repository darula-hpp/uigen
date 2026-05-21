'use client';

import type { BoardSnapshot, Pin } from '@/lib/device-simulator';
import styles from '../../board.module.css';

interface BoardStageProps {
  snapshot: BoardSnapshot;
  ledOn: boolean;
  blinking: boolean;
  onTogglePin: (pin: Pin) => void;
}

function PinRail({
  title,
  zoneClass,
  pins,
  onTogglePin,
}: {
  title: string;
  zoneClass: string;
  pins: Pin[];
  onTogglePin: (pin: Pin) => void;
}) {
  const sorted = [...pins].sort((a, b) => a.row - b.row);

  return (
    <div className={`${styles.rail} ${zoneClass}`}>
      <span className={styles.railLabel}>{title}</span>
      <div className={styles.railPins}>
        {sorted.map((pin) => (
          <button
            key={pin.id}
            type="button"
            className={[
              styles.pinNode,
              styles[pin.mode],
              pin.state === 'high' ? styles.high : '',
              pin.mode === 'output' ? styles.clickable : styles.disabled,
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={pin.mode !== 'output'}
            onClick={() => onTogglePin(pin)}
            title={pin.name}
          >
            <span>{pin.name.split(' ')[0]}</span>
            <small>{pin.state.toUpperCase()}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

export function BoardStage({ snapshot, ledOn, blinking, onTogglePin }: BoardStageProps) {
  const topPins = snapshot.pins.filter((pin) => pin.side === 'top');
  const bottomPins = snapshot.pins.filter((pin) => pin.side === 'bottom');
  const leftPins = snapshot.pins.filter((pin) => pin.side === 'left');
  const rightPins = snapshot.pins.filter((pin) => pin.side === 'right');

  return (
    <div className={styles.boardStage}>
      <PinRail title="Digital North" zoneClass={styles.zoneDigital} pins={topPins} onTogglePin={onTogglePin} />

      <div className={styles.boardMiddle}>
        <PinRail title="Power West" zoneClass={styles.zonePower} pins={leftPins} onTogglePin={onTogglePin} />

        <div className={styles.boardBody}>
          <svg className={styles.traces} viewBox="0 0 320 320" aria-hidden="true">
            <path d="M160 40 L160 110" stroke="rgba(34,211,238,0.35)" strokeWidth="2" />
            <path d="M160 210 L160 280" stroke="rgba(245,158,11,0.35)" strokeWidth="2" />
            <path d="M40 160 L110 160" stroke="rgba(244,63,94,0.35)" strokeWidth="2" />
            <path d="M210 160 L280 160" stroke="rgba(167,139,250,0.35)" strokeWidth="2" />
            <circle cx="160" cy="160" r="72" fill="none" stroke="rgba(56,189,248,0.12)" strokeWidth="1.5" />
          </svg>

          <div className={styles.boardShell}>
            <div className={styles.boardHeader}>UIGen DevBoard v1</div>
            <div className={`${styles.statusHalo} ${blinking ? styles.blinking : ''} ${ledOn ? styles.active : ''}`}>
              <div className={styles.boardChip}>
                <span>UG-CORE</span>
                <small>M4</small>
              </div>
            </div>
            <div className={`${styles.boardLed} ${ledOn ? styles.on : ''}`} aria-label="Status LED" />
            <div className={styles.boardUsb}>USB-C</div>
          </div>
        </div>

        <PinRail title="Comm East" zoneClass={styles.zoneComm} pins={rightPins} onTogglePin={onTogglePin} />
      </div>

      <PinRail title="Analog South" zoneClass={styles.zoneAnalog} pins={bottomPins} onTogglePin={onTogglePin} />
    </div>
  );
}
