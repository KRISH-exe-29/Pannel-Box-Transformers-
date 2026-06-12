import React from 'react';
import { AlertTriangle, Copy, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  handleCopy = () => {
    const errorDetails = `
Error: ${this.state.error?.toString()}

Component Stack:
${this.state.errorInfo?.componentStack}
    `.trim();
    
    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 text-[#F8FAFC]">
          <div className="bg-[#1E293B] border border-red-500/50 rounded-xl max-w-3xl w-full p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-500/20 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-red-400">Application Error</h1>
                <p className="text-[#94A3B8]">The application encountered an unexpected crash.</p>
              </div>
            </div>

            <div className="bg-[#0F172A] rounded-lg p-4 mb-6 overflow-x-auto border border-[#334155]">
              <pre className="text-sm font-mono text-red-300">
                {this.state.error && this.state.error.toString()}
              </pre>
              <pre className="text-xs font-mono text-[#94A3B8] mt-4 opacity-80 whitespace-pre-wrap">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={this.handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors font-medium"
              >
                <Copy className="w-4 h-4" />
                {this.state.copied ? 'Copied to Clipboard!' : 'Copy Error Details'}
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2 px-4 py-2 bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 border border-slate-500/30 rounded-lg transition-colors font-medium"
              >
                Go Back Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
