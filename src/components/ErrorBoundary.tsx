import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full border-2 border-red-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Configuration Error</h1>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium mb-2">Error Message:</p>
                <p className="text-red-700 font-mono text-sm">
                  {this.state.error?.message || 'Unknown error occurred'}
                </p>
              </div>

              {this.state.error?.message.includes('Supabase') && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h2 className="font-bold text-blue-900 mb-2">How to Fix This:</h2>
                  <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
                    <li>Go to your Netlify dashboard</li>
                    <li>Navigate to: <span className="font-mono bg-blue-100 px-1">Site settings → Environment variables</span></li>
                    <li>Add these two variables:
                      <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                        <li><span className="font-mono bg-blue-100 px-1">VITE_SUPABASE_URL</span></li>
                        <li><span className="font-mono bg-blue-100 px-1">VITE_SUPABASE_ANON_KEY</span></li>
                      </ul>
                    </li>
                    <li>Set scope to "All"</li>
                    <li>Trigger a new deploy</li>
                  </ol>
                </div>
              )}

              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <h2 className="font-bold text-amber-900 mb-2">Need Help?</h2>
                <p className="text-amber-800 text-sm">
                  Check the browser console (F12) for more details, or see the
                  <span className="font-mono bg-amber-100 px-1 mx-1">NETLIFY_DEPLOYMENT.md</span>
                  file in your project for complete setup instructions.
                </p>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
