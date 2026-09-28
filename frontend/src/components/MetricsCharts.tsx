import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell
} from 'recharts';
import { RAGExecutionResult, RAGEvaluationMetrics } from '../types';
import { BarChart3, Radar as RadarIcon } from 'lucide-react';

interface MetricsChartsProps {
  results: Record<string, RAGExecutionResult>;
  evaluations: Record<string, RAGEvaluationMetrics>;
}

const PASTEL_COLORS = ['#38bdf8', '#34d399', '#818cf8', '#fbbf24'];

export const MetricsCharts: React.FC<MetricsChartsProps> = ({ results, evaluations }) => {
  const architectures = Object.keys(results);

  // Bar Chart Data
  const barData = architectures.map((arch) => {
    const ev = evaluations[arch];
    const res = results[arch];
    return {
      name: arch,
      overallScore: ev ? parseFloat(ev.overall_score.toFixed(3)) : 0,
      faithfulness: ev ? parseFloat((ev.faithfulness * 100).toFixed(1)) : 0,
      contextRelevance: ev ? parseFloat((ev.context_relevance * 100).toFixed(1)) : 0,
      latencySec: res ? parseFloat(res.total_time.toFixed(2)) : 0,
    };
  });

  // Radar Chart Data
  const radarMetrics = [
    { key: 'faithfulness', label: 'Faithfulness' },
    { key: 'answer_relevance', label: 'Answer Relevance' },
    { key: 'context_relevance', label: 'Context Relevance' },
    { key: 'context_precision', label: 'Context Precision' },
  ];

  const radarData = radarMetrics.map((m) => {
    const item: any = { metric: m.label };
    architectures.forEach((arch) => {
      const ev = evaluations[arch];
      if (ev) {
        item[arch] = Math.round((ev as any)[m.key] * 100);
      }
    });
    return item;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Chart 1: Quality Score Comparison */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
          <BarChart3 className="h-4 w-4 text-sky-600" />
          <span>Overall Quality Metric by Architecture</span>
        </h4>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 1.0]} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                itemStyle={{ color: '#1e293b', fontSize: '12px', fontWeight: '500' }}
              />
              <Bar dataKey="overallScore" name="Quality Score" radius={[6, 6, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PASTEL_COLORS[index % PASTEL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Radar Comparison */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
          <RadarIcon className="h-4 w-4 text-emerald-600" />
          <span>Multi-Metric Radar Comparison</span>
        </h4>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="metric" stroke="#64748b" fontSize={10} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={9} />
              {architectures.map((arch, idx) => (
                <Radar
                  key={arch}
                  name={arch}
                  dataKey={arch}
                  stroke={PASTEL_COLORS[idx % PASTEL_COLORS.length]}
                  fill={PASTEL_COLORS[idx % PASTEL_COLORS.length]}
                  fillOpacity={0.2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

