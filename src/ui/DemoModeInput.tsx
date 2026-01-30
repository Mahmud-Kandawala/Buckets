import React, { useEffect, useCallback, useState } from 'react';

interface DemoModeInputProps {
  onPress: () => void;
  onRelease: () => void;
  isActive: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    zIndex: 100,
  },
  indicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '16px',
    border: '2px solid rgba(196, 147, 74, 0.12)',
    backdropFilter: 'blur(8px)',
    transition: 'all 0.15s ease',
  },
  indicatorActive: {
    borderColor: '#e85d26',
    backgroundColor: 'rgba(232, 93, 38, 0.2)',
    boxShadow: '0 0 30px rgba(232, 93, 38, 0.3)',
  },
  keyIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    backgroundColor: 'rgba(245, 240, 232, 0.1)',
    border: '2px solid rgba(245, 240, 232, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    color: '#f5f0e8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    transition: 'all 0.1s ease',
  },
  keyIconActive: {
    backgroundColor: '#e85d26',
    borderColor: '#e85d26',
    transform: 'scale(0.95)',
    boxShadow: '0 0 20px rgba(232, 93, 38, 0.5)',
  },
  text: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  mainText: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#f5f0e8',
  },
  subText: {
    fontSize: '12px',
    color: 'rgba(245, 240, 232, 0.5)',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(245, 240, 232, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    padding: '6px 16px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '20px',
  },
};

export const DemoModeInput: React.FC<DemoModeInputProps> = ({
  onPress,
  onRelease,
  isActive,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && !e.repeat && isActive) {
      e.preventDefault();
      setIsPressed(true);
      onPress();
    }
  }, [onPress, isActive]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && isActive) {
      e.preventDefault();
      setIsPressed(false);
      onRelease();
    }
  }, [onRelease, isActive]);

  useEffect(() => {
    if (!isActive) {
      setIsPressed(false);
      return;
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp, isActive]);

  if (!isActive) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.label}>Demo Mode</div>
      <div
        style={{
          ...styles.indicator,
          ...(isPressed ? styles.indicatorActive : {}),
        }}
      >
        <div
          style={{
            ...styles.keyIcon,
            ...(isPressed ? styles.keyIconActive : {}),
          }}
        >
          Space
        </div>
        <div style={styles.text}>
          <span style={styles.mainText}>
            {isPressed ? 'Release to shoot!' : 'Hold to charge'}
          </span>
          <span style={styles.subText}>
            {isPressed ? 'Time it in the green zone' : 'Press and hold spacebar'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DemoModeInput;
