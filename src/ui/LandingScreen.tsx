import React, { useState, useCallback } from 'react';

interface LandingScreenProps {
  onStart: () => void;
  onDemoMode: () => void;
  cameraAvailable: boolean | null;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#1c1410',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 50% 20%, rgba(196, 147, 74, 0.1) 0%, rgba(232, 93, 38, 0.06) 40%, transparent 70%)',
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '600px',
    textAlign: 'center',
  },
  logo: {
    fontSize: '80px',
    marginBottom: '16px',
    filter: 'drop-shadow(0 10px 30px rgba(232, 93, 38, 0.25))',
  },
  title: {
    fontSize: '60px',
    fontWeight: 800,
    color: '#f5f0e8',
    marginBottom: '8px',
    letterSpacing: '-2px',
    fontFamily: "'Barlow Semi Condensed', 'Barlow', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  titleAccent: {
    background: 'linear-gradient(135deg, #e85d26 0%, #c4934a 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '20px',
    color: 'rgba(245, 240, 232, 0.6)',
    marginBottom: '48px',
    lineHeight: 1.6,
    maxWidth: '480px',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    maxWidth: '320px',
  },
  button: {
    backgroundColor: '#e85d26',
    color: '#f5f0e8',
    border: 'none',
    borderRadius: '16px',
    padding: '20px 32px',
    fontSize: '18px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 8px 30px rgba(232, 93, 38, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    color: 'rgba(245, 240, 232, 0.8)',
    border: '2px solid rgba(196, 147, 74, 0.2)',
    borderRadius: '16px',
    padding: '18px 30px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  features: {
    display: 'flex',
    gap: '32px',
    marginTop: '64px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  feature: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    maxWidth: '140px',
  },
  featureIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    backgroundColor: 'rgba(196, 147, 74, 0.08)',
    border: '1px solid rgba(196, 147, 74, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  featureText: {
    fontSize: '14px',
    color: 'rgba(245, 240, 232, 0.6)',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  cameraWarning: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    padding: '12px 20px',
    backgroundColor: 'rgba(196, 147, 74, 0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(196, 147, 74, 0.3)',
  },
  warningText: {
    fontSize: '14px',
    color: 'rgba(196, 147, 74, 0.9)',
  },
  loadingSpinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(245, 240, 232, 0.3)',
    borderTopColor: '#f5f0e8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

const FEATURES = [
  { icon: '&#127909;', text: 'Live motion tracking' },
  { icon: '&#127919;', text: '2K shot meter' },
  { icon: '&#128200;', text: 'Shot tracking' },
  { icon: '&#127942;', text: 'Get in rhythm' },
];

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onStart,
  onDemoMode,
  cameraAvailable,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = useCallback(async () => {
    setIsLoading(true);
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    onStart();
  }, [onStart]);

  const handleDemoMode = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    onDemoMode();
  }, [onDemoMode]);

  return (
    <div style={styles.container}>
      <div style={styles.background} />

      <div style={styles.content}>
        <div style={styles.logo}>&#127936;</div>
        <h1 style={styles.title}>
          <span style={styles.titleAccent}>Buckets</span>
        </h1>
        <p style={styles.subtitle}>
          Your shootaround from the couch. Grab a seat, grab a ball, and get buckets.
        </p>

        <div style={styles.buttonGroup}>
          <button
            style={{
              ...styles.button,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'wait' : 'pointer',
            }}
            onClick={handleStart}
            disabled={isLoading}
          >
            {isLoading ? (
              <div style={styles.loadingSpinner} />
            ) : (
              <>
                <span>Shoot Around</span>
                <span style={{ fontSize: '20px' }}>&#8594;</span>
              </>
            )}
          </button>

          <button
            style={{
              ...styles.buttonSecondary,
              opacity: isLoading ? 0.7 : 1,
            }}
            onClick={handleDemoMode}
            disabled={isLoading}
          >
            <span style={{ fontSize: '18px' }}>&#9000;</span>
            <span>Try Demo Mode</span>
          </button>
        </div>

        {cameraAvailable === false && (
          <div style={styles.cameraWarning}>
            <span style={{ fontSize: '18px' }}>&#9888;</span>
            <span style={styles.warningText}>
              Camera not available. Try demo mode instead.
            </span>
          </div>
        )}

        <div style={styles.features}>
          {FEATURES.map((feature, i) => (
            <div key={i} style={styles.feature}>
              <div
                style={styles.featureIcon}
                dangerouslySetInnerHTML={{ __html: feature.icon }}
              />
              <span style={styles.featureText}>{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CSS Keyframes would need to be added via global styles or styled-components */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes resultPop {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LandingScreen;
