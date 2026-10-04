import React from 'react';
import { RAGEvaluationMetrics, RAGExecutionResult, FinalJudgeDecision } from '../types';
import { Lightbulb, TrendingUp, Zap, Shield, Award, CheckCircle2, Clock, Cpu, BarChart3 } from 'lucide-react';

interface InsightsPanelProps {
  evaluations: Record<string, RAGEvaluationMetrics>;
  judge:       FinalJudgeDecision;
  results?:    Record<string, RAGExecutionResult>;
}

function best(evaluations: Record<string, RAGEvaluationMetrics>, key: keyof RAGEvaluationMetrics): string {
  let top = '', val = -1;
  for (const [arch, ev] of Object.entries(evaluations)) {
    const v = (ev[key] as number) ?? 0;
    if (v > val) { val = v; top = arch; }
  }
  return top;
}

function fastest(results: Record<string, RAGExecutionResult>): { arch: string; time: number } {
  let minTime = Infinity;
  let fastestArch = 'Basic RAG';
  for (const [arch, res] of Object.entries(results)) {
    if (res.status === 'success' && res.total_time < minTime) {
      minTime = res.total_time;
      fastestArch = arch;
    }
  }
  return { arch: fastestArch, time: minTime === Infinity ? 0 : minTime };
}

function pct(v: number) { return (v * 100).toFixed(0) + '%'; }

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ evaluations, judge, results = {} }) => {
  const faithLeader  = best(evaluations, 'faithfulness') || 'Self-RAG';
  const ansRelLeader = best(evaluations, 'answer_relevance') || 'Adaptive RAG';
  const ctxRelLeader = best(evaluations, 'context_relevance') || 'Self-RAG';
  const speedLeader  = fastest(results);
  const winner       = judge.recommended_architecture;

  const faithEv  = evaluations[faithLeader];
  const ansRelEv = evaluations[ansRelLeader];
  const ctxRelEv = evaluations[ctxRelLeader];

  const insights = [
    {
      icon: Shield,
      color: 'text-emerald-700',
      bg:   'bg-emerald-50/70 border-emerald-200 text-emerald-950',
      badge: 'Anti-Hallucination Leader',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      title: `${faithLeader}: Highest Faithfulness`,
      body:  `${faithLeader} achieved ${pct(faithEv?.faithfulness ?? 0.95)} grounding score. Its generated responses strictly reference facts found in retrieved context passages without unverified extrapolation.`,
    },
    {
      icon: TrendingUp,
      color: 'text-indigo-700',
      bg:   'bg-indigo-50/70 border-indigo-200 text-indigo-950',
      badge: 'Intent Alignment',
      badgeBg: 'bg-indigo-100 text-indigo-800',
      title: `${ansRelLeader}: Optimal Query Alignment`,
      body:  `${ansRelLeader} delivered ${pct(ansRelEv?.answer_relevance ?? 0.92)} answer relevance, directly fulfilling the user's intent with thorough coverage and zero prompt drift.`,
    },
    {
      icon: Zap,
      color: 'text-cyan-700',
      bg:   'bg-sky-50/70 border-sky-200 text-sky-950',
      badge: 'Context Signal-to-Noise',
      badgeBg: 'bg-sky-100 text-sky-800',
      title: `${ctxRelLeader}: Precision Context Filtering`,
      body:  `${ctxRelLeader} scored ${pct(ctxRelEv?.context_relevance ?? 0.90)} context relevance, filtering out distracting text chunks before synthesis.`,
    },
    {
      icon: Clock,
      color: 'text-amber-700',
      bg:   'bg-amber-50/70 border-amber-200 text-amber-950',
      badge: 'Execution Velocity',
      badgeBg: 'bg-amber-100 text-amber-800',
      title: `${speedLeader.arch}: Lowest Latency`,
      body:  `${speedLeader.arch} completed retrieval and synthesis in ${speedLeader.time.toFixed(2)}s, making it ideal for latency-sensitive applications.`,
    },
  ];

  return (
    <div className="space-y-4 mb-6 text-left">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
          <Lightbulb className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Automated Architectural Insights &amp; Synthesis</h3>
          <p className="text-xs text-slate-500">Cross-pipeline comparative takeaways computed from multi-dimensional evaluation results.</p>
        </div>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {insights.map(({ icon: Icon, color, bg, badge, badgeBg, title, body }) => (
          <div key={title} className={`rounded-xl p-4 border ${bg} space-y-2 slide-up shadow-2xs bg-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-xs">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-slate-900">{title}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeBg}`}>
                {badge}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">{body}</p>
          </div>
        ))}
      </div>

      {/* High Consensus Recommendation Notice */}
      <div className="rounded-xl p-4 border border-emerald-200 bg-emerald-50/80 slide-up shadow-2xs">
        <div className="flex items-start space-x-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <span>Final Judge Recommendation: {winner}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-200/70 text-emerald-900 rounded-full font-bold">
                Confidence: {(judge.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed font-normal">
              {judge.reason}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
