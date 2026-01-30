import React, { useCallback } from 'react';
import type { UserSettings, Difficulty, DominantHand, CourtPosition } from '../types';

interface SettingsPanelProps {
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
  onClose: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  panel: {
    backgroundColor: '#2a1f17',
    borderRadius: '20px',
    padding: '32px',
    maxWidth: '400px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(196, 147, 74, 0.12)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#f5f0e8',
    margin: 0,
  },
  closeButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(245, 240, 232, 0.1)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    color: '#f5f0e8',
    transition: 'all 0.2s ease',
  },
  section: {
    marginBottom: '28px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'rgba(245, 240, 232, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '12px',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
  },
  toggleLabel: {
    fontSize: '16px',
    color: '#f5f0e8',
  },
  toggle: {
    width: '52px',
    height: '28px',
    borderRadius: '14px',
    backgroundColor: 'rgba(245, 240, 232, 0.2)',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s ease',
  },
  toggleActive: {
    backgroundColor: '#e85d26',
  },
  toggleKnob: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  toggleKnobActive: {
    left: '26px',
  },
  sliderContainer: {
    padding: '12px 0',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  slider: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    appearance: 'none',
    backgroundColor: 'rgba(245, 240, 232, 0.2)',
    cursor: 'pointer',
    outline: 'none',
  },
  sliderValue: {
    fontSize: '14px',
    color: 'rgba(245, 240, 232, 0.7)',
    minWidth: '40px',
    textAlign: 'right',
  },
  optionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  optionGridWide: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  optionButton: {
    backgroundColor: 'rgba(245, 240, 232, 0.05)',
    border: '2px solid rgba(196, 147, 74, 0.15)',
    borderRadius: '10px',
    padding: '12px 8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '14px',
    fontWeight: 500,
    color: 'rgba(245, 240, 232, 0.7)',
    textAlign: 'center',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(232, 93, 38, 0.2)',
    borderColor: '#e85d26',
    color: '#f5f0e8',
  },
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  pro: 'Pro',
};

const HAND_LABELS: Record<DominantHand, string> = {
  left: 'Left',
  right: 'Right',
};

const COURT_POSITION_LABELS: Record<CourtPosition, string> = {
  'free-throw': 'Free Throw',
  'top-key': 'Top Key',
  'left-wing': 'Left Wing',
  'right-wing': 'Right Wing',
  'corner': 'Corner',
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onClose,
}) => {
  const updateSetting = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  }, [settings, onSettingsChange]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button
            style={styles.closeButton}
            onClick={onClose}
            aria-label="Close settings"
          >
            &#10005;
          </button>
        </div>

        {/* Sound Settings */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Audio</div>
          <div style={styles.toggleRow}>
            <span style={styles.toggleLabel}>Sound Effects</span>
            <button
              style={{
                ...styles.toggle,
                ...(settings.soundEnabled ? styles.toggleActive : {}),
              }}
              onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
              aria-label={`Sound ${settings.soundEnabled ? 'on' : 'off'}`}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  ...(settings.soundEnabled ? styles.toggleKnobActive : {}),
                }}
              />
            </button>
          </div>
          <div style={styles.sliderContainer}>
            <div style={styles.toggleRow}>
              <span style={styles.toggleLabel}>Volume</span>
            </div>
            <div style={styles.sliderRow}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.soundVolume}
                onChange={(e) => updateSetting('soundVolume', parseFloat(e.target.value))}
                style={styles.slider}
                disabled={!settings.soundEnabled}
              />
              <span style={styles.sliderValue}>
                {Math.round(settings.soundVolume * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Dominant Hand */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Dominant Hand</div>
          <div style={styles.optionGrid}>
            {(Object.entries(HAND_LABELS) as [DominantHand, string][]).map(([value, label]) => (
              <button
                key={value}
                style={{
                  ...styles.optionButton,
                  ...(settings.dominantHand === value ? styles.optionButtonSelected : {}),
                }}
                onClick={() => updateSetting('dominantHand', value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Difficulty</div>
          <div style={styles.optionGrid}>
            {(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(([value, label]) => (
              <button
                key={value}
                style={{
                  ...styles.optionButton,
                  ...(settings.difficulty === value ? styles.optionButtonSelected : {}),
                }}
                onClick={() => updateSetting('difficulty', value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Court Position */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Court Position</div>
          <div style={styles.optionGridWide}>
            {(Object.entries(COURT_POSITION_LABELS) as [CourtPosition, string][]).map(([value, label]) => (
              <button
                key={value}
                style={{
                  ...styles.optionButton,
                  ...(settings.courtPosition === value ? styles.optionButtonSelected : {}),
                }}
                onClick={() => updateSetting('courtPosition', value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
