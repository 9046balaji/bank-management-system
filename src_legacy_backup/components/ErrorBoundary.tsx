/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of the component tree that crashed.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKey?: string | number;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary Class Component
 * Must be a class component as there's no hook equivalent for componentDidCatch
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call the optional error callback
    this.props.onError?.(error, errorInfo);
    
    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps: Props): void {
    // Reset the error boundary when resetKey changes
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Return custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI
 */
interface ErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onRetry }) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-[400px] flex items-center justify-center p-8"
    >
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mx-auto w-16 h-16 mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">
            error
          </span>
        </div>

        {/* Error Title */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h2>

        {/* Error Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We encountered an unexpected error. Please try again or contact support if the problem persists.
        </p>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
              Error details
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs overflow-auto max-h-40 text-red-600 dark:text-red-400">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span className="material-symbols-outlined text-sm mr-2 align-middle">
              refresh
            </span>
            Try Again
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <span className="material-symbols-outlined text-sm mr-2 align-middle">
              home
            </span>
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * HOC to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  const ComponentWithBoundary: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
  
  ComponentWithBoundary.displayName = `WithErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;
  
  return ComponentWithBoundary;
}

/**
 * Page-level Error Fallback
 * Used for major sections of the application
 */
export const PageErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onRetry }) => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
    <div className="max-w-lg w-full bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20">
      {/* Logo */}
      <div className="text-4xl font-bold text-white mb-6">
        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Aura Bank
        </span>
      </div>

      {/* Error Icon */}
      <div className="mx-auto w-20 h-20 mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
        <span className="material-symbols-outlined text-red-400 text-4xl">
          warning
        </span>
      </div>

      {/* Error Message */}
      <h1 className="text-2xl font-semibold text-white mb-3">
        Oops! Something went wrong
      </h1>
      <p className="text-gray-300 mb-8">
        We're sorry for the inconvenience. Our team has been notified and is working on a fix.
      </p>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={onRetry}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          Refresh Page
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
        >
          Return to Home
        </button>
      </div>

      {/* Support Link */}
      <p className="mt-6 text-sm text-gray-400">
        Need help?{' '}
        <a href="#support" className="text-blue-400 hover:underline">
          Contact Support
        </a>
      </p>
    </div>
  </div>
);

/**
 * Section-level Error Fallback
 * Used for smaller sections like cards or panels
 */
export const SectionErrorFallback: React.FC<ErrorFallbackProps> = ({ onRetry }) => (
  <div className="p-6 text-center bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
    <span className="material-symbols-outlined text-red-500 text-2xl mb-2">
      error_outline
    </span>
    <p className="text-sm text-red-600 dark:text-red-400 mb-3">
      Failed to load this section
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-sm text-red-600 dark:text-red-400 hover:underline"
      >
        Click to retry
      </button>
    )}
  </div>
);

export default ErrorBoundary;
