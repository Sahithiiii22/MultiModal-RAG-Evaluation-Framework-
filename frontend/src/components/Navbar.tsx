import React from 'react';
import { Cpu, Database, Award, History, Layers, CheckCircle2, MessageSquare, LogOut, User } from 'lucide-react';

export type NavTab = 'workspace' | 'metrics' | 'documents' | 'benchmark' | 'history';

interface NavbarProps {
  activeTab:    NavTab;
  setActiveTab: (tab: NavTab) => void;
  isDemoMode:   boolean;
  documentCount: number;
  userName?:    string;
  onSignOut?:   () => void;
}

const NAV_ITEMS = [
  { id: 'workspace', label: 'Query & Answers',   Icon: MessageSquare, activeColor: 'text-indigo-700 bg-white shadow-2xs font-bold' },
  { id: 'metrics',   label: 'Metrics & Insights', Icon: Cpu,           activeColor: 'text-purple-700 bg-white shadow-2xs font-bold' },
  { id: 'documents', label: 'Knowledge Base',     Icon: Database,      activeColor: 'text-emerald-700 bg-white shadow-2xs font-bold'},
  { id: 'benchmark', label: 'Suite Benchmarking', Icon: Award,         activeColor: 'text-amber-700 bg-white shadow-2xs font-bold'  },
  { id: 'history',   label: 'Query History',      Icon: History,       activeColor: 'text-slate-800 bg-white shadow-2xs font-bold'  },
] as const;

export const Navbar: React.FC<NavbarProps> = ({
  activeTab, setActiveTab, isDemoMode, documentCount, userName = 'User', onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 px-6 py-3 bg-white/90 backdrop-blur-md shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

        {/* Brand */}
        <div
          className="flex items-center space-x-3 cursor-pointer flex-shrink-0"
          onClick={() => setActiveTab('workspace')}
        >
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs">
            <Layers className="h-4.5 w-4.5" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-bold text-slate-900 tracking-tight leading-none">
              Multimodal RAG Judge
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Query-Adaptive Architecture Selection
            </div>
          </div>
        </div>

        {/* Nav Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 flex-1 max-w-xl justify-center">
          {NAV_ITEMS.map(({ id, label, Icon, activeColor }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                id={`nav-${id}`}
                onClick={() => setActiveTab(id as any)}
                className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                            transition-all duration-150 cursor-pointer
                            ${isActive
                              ? activeColor + ' border border-slate-200/90'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden md:inline">{label}</span>
                {id === 'documents' && documentCount > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold
                    ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                    {documentCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right side: mode pill + user */}
        <div className="flex items-center space-x-2.5 flex-shrink-0">
          {/* Judge Active */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full
                          bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>Judge Active</span>
          </div>

          {/* Live/Demo */}
          <div className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border ${
            isDemoMode
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}>
            {isDemoMode ? 'Offline Demo' : 'Live Groq API'}
          </div>

          {/* User avatar + sign-out */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600
                            flex items-center justify-center text-white text-[10px] font-bold shadow-2xs">
              {userName[0]?.toUpperCase() || 'U'}
            </div>
            <span className="hidden lg:block text-xs text-slate-700 font-semibold max-w-[80px] truncate">
              {userName}
            </span>
            {onSignOut && (
              <button
                id="btn-signout"
                onClick={onSignOut}
                title="Sign out"
                className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
