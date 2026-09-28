import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, Cpu, ShieldCheck, Scale, BarChart2 } from 'lucide-react';

interface ProgressIndicatorProps {
  isLoading: boolean;
}

const STEPS = [
  { id: 1, label: 'Analyzing query intent', icon: Sparkles },
  { id: 2, label: 'Running Basic RAG', icon: Cpu },
  { id: 3, label: 'Running Self-RAG', icon: ShieldCheck },
  { id: 4, label: 'Running Adaptive RAG', icon: Cpu },
  { id: 5, label: 'Running Agentic RAG', icon: Cpu },
  { id: 6, label: 'Calculating evaluation metrics', icon: BarChart2 },
  { id: 7, label: 'Final Judge recommendation', icon: Scale },
];

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ isLoading }) => {
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (!isLoading) {
      setCurrentStep(1);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length ? prev + 1 : prev));
    }, 450);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="glass border border-violet-500/30 rounded-2xl p-6 shadow-2xl mb-8 relative overflow-hidden">
      <div className="flex items-center space-x-3 mb-4">
        <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
        <h3 className="text-sm font-bold text-slate-100">Evaluating RAG Pipelines &amp; Generating Recommendations...</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {STEPS.map((step) => {
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={`flex items-center space-x-2.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : isCurrent
                  ? 'bg-violet-600/20 border-violet-500/50 text-violet-200 font-semibold shadow-md shadow-violet-900/20'
                  : 'bg-[#0b101c]/60 border-[#1a2640] text-slate-500'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="h-4 w-4 text-violet-400 animate-spin flex-shrink-0" />
              ) : (
                <Icon className="h-4 w-4 text-slate-500 flex-shrink-0" />
              )}
              <span className="truncate">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
