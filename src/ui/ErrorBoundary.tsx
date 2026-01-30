import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import type { AppError } from '../types';

interface ErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
  onDemoMode?: () => void;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
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
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#2a1f17',
    borderRadius: '24px',
    padding: '48px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 85, 85, 0.2)',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#f5f0e8',
    marginBottom: '12px',
  },
  message: {
    fontSize: '16px',
    color: 'rgba(245, 240, 232, 0.7)',
    marginBottom: '32px',
    lineHeight: 1.6,
  },
  errorDetails: {
    backgroundColor: 'rgba(255, 85, 85, 0.1)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'left',
    maxHeight: '150px',
    overflow: 'auto',
  },
  errorText: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#ff8888',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  button: {
    backgroundColor: '#e85d26',
    color: '#f5f0e8',
    border: 'none',
    borderRadius: '12px',
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    color: 'rgba(245, 240, 232, 0.7)',
    border: '2px solid rgba(196, 147, 74, 0.2)',
    borderRadius: '12px',
    padding: '14px 28px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
  },
  helpText: {
    marginTop: '24px',
    fontSize: '13px',
    color: 'rgba(245, 240, 232, 0.4)',
    lineHeight: 1.5,
  },
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console
    console.error('Buckets Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRetry?.();
  };

  handleDemoMode = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onDemoMode?.();
  };

  handleRefresh = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo } = this.state;
      const errorMessage = error?.message || 'An unexpected error occurred';
      const showDetails = process.env.NODE_ENV === 'development' || errorInfo;

      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}>&#128679;</div>
            <h1 style={styles.title}>Something went wrong</h1>
            <p style={styles.message}>
              We ran into a problem. Don't worry, your progress is safe.
              Try refreshing or switch to demo mode.
            </p>

            {showDetails && (
              <div style={styles.errorDetails}>
                <code style={styles.errorText}>
                  {errorMessage}
                  {errorInfo?.componentStack && (
                    <>
                      {'\n\nComponent Stack:'}
                      {errorInfo.componentStack.slice(0, 500)}
                      {errorInfo.componentStack.length > 500 ? '...' : ''}
                    </>
                  )}
                </code>
              </div>
            )}

            <div style={styles.buttonGroup}>
              <button style={styles.button} onClick={this.handleRefresh}>
                Refresh Page
              </button>
              {this.props.onRetry && (
                <button style={styles.buttonSecondary} onClick={this.handleRetry}>
                  Try Again
                </button>
              )}
              {this.props.onDemoMode && (
                <button style={styles.buttonSecondary} onClick={this.handleDemoMode}>
                  Switch to Demo Mode
                </button>
              )}
            </div>

            <p style={styles.helpText}>
              If this keeps happening, try clearing your browser cache
              or using a different browser.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional error display component for non-boundary errors
interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDemoMode?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDemoMode,
}) => {
  const getIcon = (): string => {
    switch (error.code) {
      case 'PERMISSION_DENIED':
        return '&#128274;'; // lock
      case 'NOT_FOUND':
        return '&#128247;'; // camera
      case 'IN_USE':
        return '&#128683;'; // warning
      case 'LOAD_FAILED':
      case 'INIT_FAILED':
        return '&#128268;'; // plug
      default:
        return '&#128679;'; // construction
    }
  };

  const getTitle = (): string => {
    switch (error.code) {
      case 'PERMISSION_DENIED':
        return 'Camera Access Required';
      case 'NOT_FOUND':
        return 'Camera Not Found';
      case 'IN_USE':
        return 'Camera In Use';
      case 'LOAD_FAILED':
      case 'INIT_FAILED':
        return 'Loading Failed';
      default:
        return 'Something Went Wrong';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div
          style={styles.icon}
          dangerouslySetInnerHTML={{ __html: getIcon() }}
        />
        <h1 style={styles.title}>{getTitle()}</h1>
        <p style={styles.message}>{error.message}</p>

        <div style={styles.buttonGroup}>
          {error.action === 'retry' && onRetry && (
            <button style={styles.button} onClick={onRetry}>
              Try Again
            </button>
          )}
          {error.action === 'demo_mode' && onDemoMode && (
            <button style={styles.button} onClick={onDemoMode}>
              Continue in Demo Mode
            </button>
          )}
          {error.action === 'refresh' && (
            <button style={styles.button} onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          )}
          {onDemoMode && error.action !== 'demo_mode' && (
            <button style={styles.buttonSecondary} onClick={onDemoMode}>
              Try Demo Mode Instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;
