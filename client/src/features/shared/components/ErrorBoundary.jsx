import React from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCcw, Home, MessageSquare } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    // You could also log the error to an error reporting service here
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header with Icon */}
            <div className="bg-red-50 p-10 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/50 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative z-10 w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center animate-bounce-slow">
                    <ShieldAlert className="h-10 w-10 text-red-600" />
                </div>
            </div>

            {/* Content */}
            <div className="p-8 text-center space-y-4">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Something went wrong.</h1>
              <p className="text-slate-500 font-medium">
                ShramFlow encountered an unexpected error. Don't worry, your data is safe.
              </p>
              
              {this.state.error && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl text-left overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Error Signature</p>
                  <p className="text-xs font-mono text-red-600 truncate">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-6 grid grid-cols-2 gap-3">
                <Button 
                    variant="outline" 
                    onClick={this.handleGoHome}
                    className="h-12 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                    <Home className="h-4 w-4 mr-2" />
                    Home
                </Button>
                <Button 
                    onClick={this.handleReset}
                    className="h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Reload
                </Button>
              </div>

              <div className="pt-4">
                <button 
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors flex items-center justify-center mx-auto"
                    onClick={() => window.open('https://wa.me/your-support-number', '_blank')}
                >
                    <MessageSquare className="h-3 w-3 mr-1.5" />
                    Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
