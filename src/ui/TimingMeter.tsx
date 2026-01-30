import React from 'react';
import type { TimingZone } from '../types';

interface TimingMeterProps {
  value: number;
  zone: TimingZone;
  isActive: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    right: '24px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '32px',
    height: '280px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 100,
  },
  meterOuter: {
    width: '100%',
    height: '240px',
    borderRadius: '16px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
  },
  zonesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  redZoneTop: {
    flex: '15%',
    background: 'linear-gradient(180deg, #ff3333 0%, #cc2222 100%)',
    opacity: 0.6,
  },
  yellowZoneTop: {
    flex: '15%',
    background: 'linear-gradient(180deg, #ffcc00 0%, #cc9900 100%)',
    opacity: 0.6,
  },
  greenZone: {
    flex: '40%',
    background: 'linear-gradient(180deg, #00cc44 0%, #00ff55 50%, #00cc44 100%)',
    opacity: 0.6,
  },
  yellowZoneBottom: {
    flex: '15%',
    background: 'linear-gradient(180deg, #cc9900 0%, #ffcc00 100%)',
    opacity: 0.6,
  },
  redZoneBottom: {
    flex: '15%',
    background: 'linear-gradient(180deg, #cc2222 0%, #ff3333 100%)',
    opacity: 0.6,
  },
  fillContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    left: '-4px',
    right: '-4px',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: '#ffffff',
    boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
    transition: 'bottom 16ms linear',
  },
  label: {
    marginTop: '8px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  inactiveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '13px',
  },
};

const getZoneColor = (zone: TimingZone): string => {
  switch (zone) {
    case 'green':
      return '#00ff55';
    case 'yellow':
      return '#ffcc00';
    case 'red':
      return '#ff3333';
  }
};

const getGlowStyle = (zone: TimingZone, isActive: boolean): React.CSSProperties => {
  if (!isActive) return {};

  const color = getZoneColor(zone);
  const intensity = zone === 'green' ? '30px' : zone === 'yellow' ? '15px' : '10px';

  return {
    boxShadow: `0 0 ${intensity} ${color}, inset 0 0 ${intensity} ${color}`,
  };
};

export const TimingMeter: React.FC<TimingMeterProps> = ({ value, zone, isActive }) => {
  const clampedValue = Math.max(0, Math.min(1, value));
  const fillHeight = clampedValue * 100;
  const indicatorBottom = `calc(${fillHeight}% - 3px)`;

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.meterOuter,
          ...getGlowStyle(zone, isActive),
          transition: 'box-shadow 0.15s ease',
        }}
      >
        {/* Zone backgrounds */}
        <div style={styles.zonesContainer}>
          <div style={styles.redZoneTop} />
          <div style={styles.yellowZoneTop} />
          <div style={styles.greenZone} />
          <div style={styles.yellowZoneBottom} />
          <div style={styles.redZoneBottom} />
        </div>

        {/* Fill indicator */}
        {isActive && (
          <div
            style={{
              ...styles.indicator,
              bottom: indicatorBottom,
              backgroundColor: getZoneColor(zone),
              boxShadow: `0 0 12px ${getZoneColor(zone)}, 0 0 24px ${getZoneColor(zone)}`,
            }}
          />
        )}

        {/* Inactive overlay */}
        {!isActive && <div style={styles.inactiveOverlay} />}
      </div>

      <span
        style={{
          ...styles.label,
          color: isActive ? getZoneColor(zone) : 'rgba(255, 255, 255, 0.4)',
        }}
      >
        {isActive ? zone.toUpperCase() : 'READY'}
      </span>
    </div>
  );
};

export default TimingMeter;
