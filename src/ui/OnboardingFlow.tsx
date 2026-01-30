import React, { useState, useCallback } from 'react';
import type { Difficulty, DominantHand, UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

interface OnboardingFlowProps {
  onComplete: (settings: UserSettings) => void;
  onSkipToDemo?: () => void;
}

type OnboardingStep = 'welcome' | 'camera' | 'hand' | 'difficulty' | 'tutorial';

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    zIndex: 1000,
  },
  card: {
    backgroundColor: '#2a1f17',
    borderRadius: '24px',
    padding: '48px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(196, 147, 74, 0.12)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#f5f0e8',
    marginBottom: '16px',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(245, 240, 232, 0.7)',
    marginBottom: '32px',
    lineHeight: 1.6,
  },
  button: {
    backgroundColor: '#e85d26',
    color: '#f5f0e8',
    border: 'none',
    borderRadius: '12px',
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    marginTop: '16px',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    color: 'rgba(245, 240, 232, 0.7)',
    border: '2px solid rgba(196, 147, 74, 0.2)',
    borderRadius: '12px',
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    marginTop: '12px',
  },
  optionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  optionButton: {
    backgroundColor: 'rgba(245, 240, 232, 0.05)',
    border: '2px solid rgba(196, 147, 74, 0.15)',
    borderRadius: '12px',
    padding: '20px 16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(232, 93, 38, 0.2)',
    borderColor: '#e85d26',
  },
  optionLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#f5f0e8',
  },
  optionDescription: {
    fontSize: '12px',
    color: 'rgba(245, 240, 232, 0.5)',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  stepIndicator: {
    display: 'flex',
    gap: '8px',
    marginBottom: '32px',
  },
  stepDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'rgba(245, 240, 232, 0.2)',
    transition: 'all 0.2s ease',
  },
  stepDotActive: {
    backgroundColor: '#e85d26',
    width: '24px',
    borderRadius: '4px',
  },
  tutorialItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    textAlign: 'left',
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: 'rgba(245, 240, 232, 0.05)',
    borderRadius: '12px',
  },
  tutorialNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#e85d26',
    color: '#f5f0e8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    flexShrink: 0,
  },
  tutorialText: {
    fontSize: '14px',
    color: 'rgba(245, 240, 232, 0.8)',
    lineHeight: 1.5,
  },
  errorText: {
    color: '#ff5555',
    fontSize: '14px',
    marginTop: '12px',
  },
};

const STEP_ORDER: OnboardingStep[] = ['welcome', 'camera', 'hand', 'difficulty', 'tutorial'];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'Easy', description: 'Large green zone' },
  { value: 'medium', label: 'Medium', description: 'Balanced timing' },
  { value: 'hard', label: 'Hard', description: 'Tight window' },
  { value: 'pro', label: 'Pro', description: 'Precision required' },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkipToDemo }) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);

  const stepIndex = STEP_ORDER.indexOf(step);

  const goToNext = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(step);
    const nextStep = STEP_ORDER[currentIndex + 1];
    if (currentIndex < STEP_ORDER.length - 1 && nextStep) {
      setStep(nextStep);
    }
  }, [step]);

  const requestCamera = useCallback(async () => {
    setIsRequestingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      goToNext();
    } catch {
      setCameraPermission('denied');
    } finally {
      setIsRequestingCamera(false);
    }
  }, [goToNext]);

  const handleComplete = useCallback(() => {
    onComplete(settings);
  }, [settings, onComplete]);

  const renderStepIndicator = () => (
    <div style={styles.stepIndicator}>
      {STEP_ORDER.map((s, i) => (
        <div
          key={s}
          style={{
            ...styles.stepDot,
            ...(i <= stepIndex ? styles.stepDotActive : {}),
            ...(i < stepIndex ? { width: '8px' } : {}),
          }}
        />
      ))}
    </div>
  );

  const renderWelcome = () => (
    <>
      <div style={styles.icon}>&#127936;</div>
      <h1 style={styles.title}>Welcome to Buckets</h1>
      <p style={styles.subtitle}>
        Your shootaround starts here. Get set up and start getting buckets.
      </p>
      <button style={styles.button} onClick={goToNext}>
        Get Started
      </button>
      {onSkipToDemo && (
        <button style={styles.buttonSecondary} onClick={onSkipToDemo}>
          Try Demo Mode
        </button>
      )}
    </>
  );

  const renderCamera = () => (
    <>
      <div style={styles.icon}>&#128247;</div>
      <h1 style={styles.title}>Camera Access</h1>
      <p style={styles.subtitle}>
        Buckets uses your camera to track your shooting motion while you're seated.
        Your video stays on your device and is never uploaded.
      </p>
      <button
        style={{
          ...styles.button,
          opacity: isRequestingCamera ? 0.7 : 1,
        }}
        onClick={requestCamera}
        disabled={isRequestingCamera}
      >
        {isRequestingCamera ? 'Requesting...' : 'Allow Camera Access'}
      </button>
      {cameraPermission === 'denied' && (
        <>
          <p style={styles.errorText}>
            Camera access was denied. Please enable it in your browser settings.
          </p>
          {onSkipToDemo && (
            <button style={styles.buttonSecondary} onClick={onSkipToDemo}>
              Continue in Demo Mode
            </button>
          )}
        </>
      )}
    </>
  );

  const renderHandSelection = () => (
    <>
      <div style={styles.icon}>&#9995;</div>
      <h1 style={styles.title}>Dominant Hand</h1>
      <p style={styles.subtitle}>
        Which hand do you shoot with?
      </p>
      <div style={styles.optionGrid}>
        <button
          style={{
            ...styles.optionButton,
            ...(settings.dominantHand === 'left' ? styles.optionButtonSelected : {}),
          }}
          onClick={() => setSettings(s => ({ ...s, dominantHand: 'left' }))}
        >
          <span style={{ fontSize: '32px' }}>&#129307;</span>
          <span style={styles.optionLabel}>Left</span>
        </button>
        <button
          style={{
            ...styles.optionButton,
            ...(settings.dominantHand === 'right' ? styles.optionButtonSelected : {}),
          }}
          onClick={() => setSettings(s => ({ ...s, dominantHand: 'right' }))}
        >
          <span style={{ fontSize: '32px' }}>&#129308;</span>
          <span style={styles.optionLabel}>Right</span>
        </button>
      </div>
      <button style={styles.button} onClick={goToNext}>
        Continue
      </button>
    </>
  );

  const renderDifficulty = () => (
    <>
      <div style={styles.icon}>&#127919;</div>
      <h1 style={styles.title}>Select Difficulty</h1>
      <p style={styles.subtitle}>
        Choose your timing window size. You can change this anytime.
      </p>
      <div style={styles.optionGrid}>
        {DIFFICULTY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            style={{
              ...styles.optionButton,
              ...(settings.difficulty === opt.value ? styles.optionButtonSelected : {}),
            }}
            onClick={() => setSettings(s => ({ ...s, difficulty: opt.value }))}
          >
            <span style={styles.optionLabel}>{opt.label}</span>
            <span style={styles.optionDescription}>{opt.description}</span>
          </button>
        ))}
      </div>
      <button style={styles.button} onClick={goToNext}>
        Continue
      </button>
    </>
  );

  const renderTutorial = () => (
    <>
      <h1 style={styles.title}>How It Works</h1>
      <div style={styles.tutorialItem}>
        <div style={styles.tutorialNumber}>&#129681;</div>
        <p style={styles.tutorialText}>
          <strong>Take a seat</strong> - Buckets is designed to be played sitting down.
          Find a comfortable spot with room to move your arms.
        </p>
      </div>
      <div style={styles.tutorialItem}>
        <div style={styles.tutorialNumber}>1</div>
        <p style={styles.tutorialText}>
          <strong>Get in position</strong> - Hold the ball in shooting stance.
          The meter will activate when your form is detected.
        </p>
      </div>
      <div style={styles.tutorialItem}>
        <div style={styles.tutorialNumber}>2</div>
        <p style={styles.tutorialText}>
          <strong>Time your release</strong> - Watch the timing meter fill up.
          Release when the indicator is in the green zone for best results.
        </p>
      </div>
      <div style={styles.tutorialItem}>
        <div style={styles.tutorialNumber}>3</div>
        <p style={styles.tutorialText}>
          <strong>See your results</strong> - Get instant feedback on your timing.
          Build consistency by hitting the green zone repeatedly.
        </p>
      </div>
      <button style={styles.button} onClick={handleComplete}>
        Let's Go
      </button>
    </>
  );

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return renderWelcome();
      case 'camera':
        return renderCamera();
      case 'hand':
        return renderHandSelection();
      case 'difficulty':
        return renderDifficulty();
      case 'tutorial':
        return renderTutorial();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {step !== 'welcome' && renderStepIndicator()}
        {renderStep()}
      </div>
    </div>
  );
};

export default OnboardingFlow;
