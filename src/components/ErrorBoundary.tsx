import { Component, type ReactNode } from 'react';
import { ErrorPage } from '../pages/ErrorPage';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches React errors and displays a fallback UI
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error('Error Boundary caught an error:', error, errorInfo);

    // In production, you would send this to an error tracking service
    // e.g., Sentry.captureException(error, { extra: errorInfo });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided, otherwise use default ErrorPage
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return <ErrorPage error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}
