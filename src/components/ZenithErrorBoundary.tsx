import * as React from 'react';
import { Activity, AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ZenithErrorBoundary extends React.Component<Props, State> {
  public props: Props;
  public state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ZENITH_CRITICAL_ERROR:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-white border-2 border-slate-950/20 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden tech-corners">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500" />
            
            <div className="space-y-8 relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 animate-pulse">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tighter leading-none">LỖI HỆ THỐNG NGHIÊM TRỌNG</h2>
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] font-mono mt-2">SYSTEM_CRITICAL_HALT_DETECTED</p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Activity size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest font-mono">ERROR_STACK_TRACE</span>
                </div>
                <p className="text-xs font-mono font-bold text-slate-600 break-words line-clamp-3">
                  {this.state.error?.message || 'Không xác định được nguyên nhân sự cố.'}
                </p>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full h-16 bg-slate-950 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-rose-600 transition-all shadow-xl active:scale-95 group"
                >
                  <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
                  KÍCH HOẠT LẠI HỆ THỐNG
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

export default ZenithErrorBoundary;
