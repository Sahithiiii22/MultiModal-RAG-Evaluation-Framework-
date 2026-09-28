import React from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Cell,
} from 'recharts';
import { RAGExecutionResult, RAGEvaluationMetrics, FinalJudgeDecision, PipelineExecutionResponse } from '../types';
import { Trophy, Clock, Cpu, BarChart2, Target, CheckCircle2, XCircle, Download, FileText, Sparkles } from 'lucide-react';
import { InsightsPanel } from './InsightsPanel';
import { exportComparisonToCSV, exportComparisonToMarkdown } from '../services/exportUtils';

interface MetricsDashboardProps {
  results:    Record<string, RAGExecutionResult>;
  evaluations: Record<string, RAGEvaluationMetrics>;
  judge:       FinalJudgeDecision;
  fullResponse?: PipelineExecutionResponse;
}

// Pastel-compatible architecture colors
const ARCH_COLORS: Record<string, string> = {
  'Basic RAG':    '#0284c7', // Sky blue
  'Self-RAG':     '#059669', // Emerald
  'Adaptive RAG': '#7c3aed', // Purple
  'Agentic RAG':  '#d97706', // Amber
};

const METRICS: { key: keyof RAGEvaluationMetrics; label: string }[] = [
  { key: 'faithfulness',      label: 'Faithfulness'       },
  { key: 'answer_relevance',  label: 'Answer Relevance'   },
  { key: 'context_relevance', label: 'Context Relevance'  },
  { key: 'context_precision', label: 'Context Precision'  },
  { key: 'context_recall',    label: 'Context Recall'     },
  { key: 'overall_score',     label: 'Overall Score'      },
];

function scoreColor(v: number): string {
  if (v >= 0.80) return '#059669';  // emerald
  if (v >= 0.65) return '#d97706';  // amber
  return '#e11d48';                  // rose
}

function scoreLabel(v: number): string {
  if (v >= 0.80) return 'text-emerald-700';
  if (v >= 0.65) return 'text-amber-700';
  return 'text-rose-700';
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white rounded-xl px-3.5 py-2.5 border border-slate-200 shadow-md text-xs space-y-1 text-left">
        <div className="font-bold text-slate-900">{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center space-x-2">
            <span style={{ color: p.fill || p.stroke }} className="font-mono font-bold">
              {typeof p.value === 'number' && p.value <= 1.01
                ? (p.value * 100).toFixed(0) + '%'
                : p.value}
            </span>
            <span className="text-slate-600">{p.name}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ── Single Architecture Card (Pastel) ─────────────────────────────────────────
const ArchCard: React.FC<{
  arch:        string;
  result:      RAGExecutionResult;
  evaluation:  RAGEvaluationMetrics;
  isWinner:    boolean;
  isJudge:     boolean;
  rank:        number;
}> = ({ arch, result, evaluation: ev, isWinner, isJudge, rank }) => {
  const color  = ARCH_COLORS[arch] || '#6366f1';
  const rankBg = rank === 1 ? 'bg-indigo-600 text-white shadow-xs' : rank === 2 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500';

  return (
    <div className={`glass rounded-2xl p-5 flex flex-col space-y-3.5 text-left slide-up relative overflow-hidden transition-all duration-200 bg-white
      ${isWinner ? 'border-indigo-300 ring-2 ring-indigo-400/20 shadow-md shadow-indigo-100' : 'border-slate-200/90 shadow-2xs hover:border-slate-300'}`}>

      {/* Top color strip */}
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: color }} />

      {/* Header */}
      <div className="flex items-start justify-between pt-1">
        <div className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm"
               style={{ background: color + '18', color }}>
            {arch[0]}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">{arch}</div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              {result.status === 'success'
                ? <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                : <XCircle      className="h-3 w-3 text-rose-500"    />}
              <span className="text-[10px] text-slate-500 font-medium">
                {result.status === 'success' ? 'Success' : 'Failed'} &bull; {result.retrieved_context.length} passages
              </span>
            </div>
          </div>
        </div>

        {/* Rank badge */}
        <div className={`h-6 w-6 rounded-full ${rankBg} flex items-center justify-center text-[10px] font-bold`}>
          #{rank}
        </div>
      </div>

      {/* Winner / Judge Badges */}
      <div className="flex flex-wrap gap-1.5">
        {isWinner && (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold
                           bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Trophy className="h-3 w-3" />
            <span>Highest Metric Score</span>
          </span>
        )}
        {isJudge && (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold
                           bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Target className="h-3 w-3" />
            <span>Finalized Winner</span>
          </span>
        )}
      </div>

      {/* Overall score + latency */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200 text-center">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Overall Score</div>
          <div className={`text-lg font-black mt-0.5 font-mono ${scoreLabel(ev.overall_score)}`}>
            {(ev.overall_score * 100).toFixed(1)}
            <span className="text-[11px] font-normal text-slate-400"> /100</span>
          </div>
        </div>
        <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200 text-center">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Latency</div>
          <div className="flex items-center justify-center space-x-1 mt-0.5">
            <Clock className="h-3 w-3 text-slate-400" />
            <span className="text-lg font-black font-mono text-slate-800">{result.total_time.toFixed(2)}</span>
            <span className="text-xs text-slate-400">s</span>
          </div>
        </div>
      </div>

      {/* Metric Bars */}
      <div className="space-y-1.5 pt-1 border-t border-slate-100">
        {[
          { label: 'Faithfulness',       val: ev.faithfulness,      c: '#059669' },
          { label: 'Answer Relevance',   val: ev.answer_relevance,  c: '#6366f1' },
          { label: 'Context Relevance',  val: ev.context_relevance, c: '#0284c7' },
          { label: 'Correctness',        val: ev.correctness ?? 0,  c: '#d97706' },
        ].map(({ label, val, c }) => (
          <div key={label} className="space-y-0.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-600 font-medium">{label}</span>
              <span className="font-mono font-bold text-slate-800">{(val * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full metric-bar-fill"
                style={{ '--bar-w': `${val * 100}%`, background: c } as any}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main MetricsDashboard Component ──────────────────────────────────────────
export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  results, evaluations, judge, fullResponse,
}) => {
  const archs = Object.keys(results);
  const winner = judge.recommended_architecture;

  // Radar data
  const radarData = METRICS.map(({ key, label }) => {
    const row: Record<string, any> = { metric: label };
    for (const arch of archs) {
      const ev = evaluations[arch];
      row[arch] = ev ? (ev[key] as number) ?? 0 : 0;
    }
    return row;
  });

  // Bar latency data
  const latencyData = archs.map((arch) => ({
    arch,
    total:      results[arch]?.total_time      ?? 0,
    retrieval:  results[arch]?.retrieval_time  ?? 0,
    generation: results[arch]?.generation_time ?? 0,
  }));

  // Handlers for export
  const handleExportCSV = () => {
    if (fullResponse) exportComparisonToCSV(fullResponse);
  };
  const handleExportMarkdown = () => {
    if (fullResponse) exportComparisonToMarkdown(fullResponse);
  };

  return (
    <div className="space-y-6 text-left">
      {/* ── SECTION HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <BarChart2 className="h-5 w-5 text-indigo-600" />
            <span>Architecture Performance &amp; Evaluation Matrix</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-evaluated across 6 standardized dimensions: Faithfulness, Relevance, Precision, Correctness, Recall, and Latency
          </p>
        </div>

        {fullResponse && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                         bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-indigo-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportMarkdown}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                         bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-purple-600" />
              <span>Export Report</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 4 ARCHITECTURE CARDS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {archs.map((arch, idx) => {
          const res = results[arch];
          const ev  = evaluations[arch];
          if (!res || !ev) return null;

          const isJudge  = arch === judge.recommended_architecture;
          const isWinner = arch === winner;

          return (
            <ArchCard
              key={arch}
              arch={arch}
              result={res}
              evaluation={ev}
              isWinner={isWinner}
              isJudge={isJudge}
              rank={idx + 1}
            />
          );
        })}
      </div>

      {/* ── CHARTS ROW: RADAR & LATENCY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Radar Comparison Chart */}
        <div className="glass rounded-2xl p-5 border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>Multi-Dimensional Radar Profile</span>
            </div>
            <span className="text-[11px] text-slate-500">6 Dimensions</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} />
                <PolarRadiusAxis domain={[0, 1]} tick={{ fill: '#94a3b8', fontSize: 9 }} stroke="#e2e8f0" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                {archs.map((arch) => (
                  <Radar
                    key={arch}
                    name={arch}
                    dataKey={arch}
                    stroke={ARCH_COLORS[arch] || '#6366f1'}
                    fill={ARCH_COLORS[arch] || '#6366f1'}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency Breakdown Bar Chart */}
        <div className="glass rounded-2xl p-5 border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="h-4 w-4 text-cyan-600" />
              <span>Execution Latency (Seconds)</span>
            </div>
            <span className="text-[11px] text-slate-500">Retrieval + Generation</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} unit="s" stroke="#cbd5e1" />
                <YAxis dataKey="arch" type="category" tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} stroke="#cbd5e1" width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="retrieval"  name="Retrieval Time"  stackId="a" fill="#0284c7" radius={[0, 0, 0, 0]} />
                <Bar dataKey="generation" name="Generation Time" stackId="a" fill="#818cf8" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── ANALYTICAL INSIGHTS PANEL ── */}
      <InsightsPanel evaluations={evaluations} judge={judge} />
    </div>
  );
};
