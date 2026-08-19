import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught React UI error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.removeItem('auth_token');
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0E0E0E] text-slate-100 flex items-center justify-center p-6 font-mono">
          <div className="max-w-xl w-full bg-[#161616] border border-[#FF3B30]/40 p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-[#2A2A2A] pb-4">
              <div className="p-2.5 bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/30 rounded">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white uppercase tracking-wider">
                  UI Runtime Recovery
                </h1>
                <p className="text-xs text-[#888]">
                  Smart Road Damage Detection System Interface
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#0A0A0A] border border-[#222] text-xs text-rose-400 space-y-2 overflow-x-auto">
              <div className="font-bold text-slate-200">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'An unexpected rendering error occurred.'}
              </div>
              {this.state.error?.stack && (
                <pre className="text-[10px] text-[#666] leading-relaxed max-h-36 overflow-y-auto">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-[0_0_10px_rgba(37,99,235,0.3)]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Dashboard</span>
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-[#1E1E1E] hover:bg-[#2A2A2A] text-slate-300 text-xs font-bold uppercase tracking-wider border border-[#333] transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Reset & Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
