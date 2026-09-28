import React, { useState } from 'react';
import { Layers, Eye, EyeOff, LogIn, Sparkles, Shield, Zap } from 'lucide-react';

interface SignInProps {
  onSignIn: (name: string) => void;
}

export const SignIn: React.FC<SignInProps> = ({ onSignIn }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSignIn(name.trim());
    }, 600);
  };

  const features = [
    { icon: Layers,  label: 'Multi-Architecture RAG',   desc: 'Basic, Self, Adaptive & Agentic RAG' },
    { icon: Shield,  label: 'Anti-Hallucination Judge',  desc: 'Strict verified context evaluation' },
    { icon: Zap,     label: 'Real-Time Benchmarking',    desc: 'Live metric comparison & trade-offs' },
    { icon: Sparkles,label: 'Intelligent Insights',      desc: 'Automated winner recommendation' },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70">
      {/* ── Left Panel (Branding) ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 border-r border-slate-200/80 bg-white/70 backdrop-blur-md">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs">
            <Layers className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">Multimodal RAG Judge</span>
        </div>

        {/* Tagline */}
        <div className="space-y-6 text-left">
          <div className="space-y-3">
            <h1 className="text-5xl font-black text-slate-900 leading-tight tracking-tight">
              Query-Adaptive<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                Architecture Selection
              </span>
            </h1>
            <p className="text-slate-600 text-base leading-relaxed max-w-md">
              Benchmark all four RAG architectures simultaneously. The Final Judge evaluates metrics and picks the optimal pipeline for every query with zero hallucination.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-left space-y-1 shadow-2xs">
                <Icon className="h-5 w-5 text-indigo-600" />
                <div className="text-sm font-bold text-slate-900">{label}</div>
                <div className="text-xs text-slate-500">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium text-left">
          Enterprise Multimodal RAG Evaluation &bull; v1.0.0
        </div>
      </div>

      {/* ── Right Panel (Form) ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full glass rounded-3xl p-8 border border-slate-200 shadow-md space-y-6 bg-white text-left">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="text-sm text-slate-500">Sign in to access your RAG evaluation workspace</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sahithi"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Enter Workspace</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
