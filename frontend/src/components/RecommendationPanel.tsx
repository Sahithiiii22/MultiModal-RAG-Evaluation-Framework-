import React from 'react';
import { Award, Sparkles, Zap, Layers } from 'lucide-react';
import { FinalJudgeDecision, QueryClassification } from '../types';

interface RecommendationPanelProps {
  judge: FinalJudgeDecision;
  classification: QueryClassification;
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({ judge, classification }) => {
  return (
    <div className="glass rounded-2xl p-6 shadow-sm border border-slate-200/90 bg-white mb-6 relative overflow-hidden text-left">
      {/* Top pastel accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold tracking-wider text-indigo-600 uppercase">
                Final Judge Recommendation
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                Dynamic Synthesis
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mt-0.5">
              {judge.recommended_architecture}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Confidence</div>
            <div className="text-base font-bold text-indigo-600 font-mono">
              {(judge.confidence * 100).toFixed(0)}%
            </div>
          </div>

          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Query Category</div>
            <div className="text-sm font-semibold text-slate-800 capitalize">
              {classification?.query_type ? classification.query_type.replace('_', ' ') : 'General'}
            </div>
          </div>
        </div>
      </div>

      {/* Explanation Box */}
      <div className="bg-indigo-50/70 rounded-xl p-4 sm:p-5 border border-indigo-100 mb-5">
        <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1.5 flex items-center space-x-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Why {judge.recommended_architecture} Was Finalized</span>
        </h4>
        <p className="text-slate-700 text-sm leading-relaxed font-normal">
          {judge.reason}
        </p>
      </div>

      {/* Grid: Rankings & Trade-off Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Architecture Rankings */}
        <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <span>Architecture Suitability Ranking</span>
          </h4>
          <div className="space-y-2">
            {judge.ranking && judge.ranking.map((item) => (
              <div
                key={item.architecture}
                className={`flex items-start justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                  item.rank === 1
                    ? 'bg-indigo-50/90 border-indigo-300 text-slate-900 font-medium'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span
                    className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      item.rank === 1 ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    #{item.rank}
                  </span>
                  <span className="font-bold text-slate-800">{item.architecture}</span>
                </div>
                <span className="text-[11px] text-slate-500 max-w-xs text-right leading-tight">
                  {item.reason}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Trade-off Analysis */}
        <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Comparative Trade-Off Analysis</span>
          </h4>
          <div className="space-y-2">
            {judge.tradeoff_analysis && Object.entries(judge.tradeoff_analysis).map(([key, val]) => (
              <div key={key} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-indigo-900 mb-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  {key}
                </div>
                <div className="text-slate-600 leading-normal">{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
