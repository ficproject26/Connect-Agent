import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    const isChunkError =
      this.state.error?.message?.includes('dynamically imported module') ||
      this.state.error?.message?.includes('Loading chunk') ||
      this.state.error?.message?.includes('Importing a module script failed');

    if (isChunkError) {
      window.sessionStorage.removeItem('retry-lazy-refreshed');
      window.location.reload();
      return;
    }

    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message?.includes('dynamically imported module') ||
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Importing a module script failed');

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-6">
          {/* Icon */}
          <div className="p-4 bg-red-500/10 dark:bg-red-500/20 rounded-full">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-forgeGray-900 dark:text-white font-sans">
              {isChunkError ? 'Application Updated' : 'Something went wrong'}
            </h2>
            <p className="text-sm font-semibold text-forgeGray-450 dark:text-forgeGray-400 max-w-md">
              {isChunkError
                ? 'A new version of the application was deployed. Please reload the page to continue.'
                : this.props.fallbackMessage ||
                  'An unexpected error occurred while rendering this page. Please try again.'}
            </p>
          </div>

          {/* Error detail */}
          {this.state.error && (
            <div className="w-full max-w-lg bg-forgeGray-50 dark:bg-slate-900 border border-forgeGray-200 dark:border-slate-700 rounded-forge p-4 text-left">
              <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                {this.state.error.message}
              </p>
            </div>
          )}

          {/* Retry Button */}
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-forgeGray-950 font-bold text-sm rounded-forge shadow-md transition-all duration-200 hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            {isChunkError ? 'Reload Page' : 'Try Again'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
