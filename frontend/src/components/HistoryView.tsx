import React, { useEffect, useState } from 'react';
import { History, Clock, ArrowRight, Download, RefreshCw } from 'lucide-react';
import { PipelineExecutionResponse } from '../types';
import { api } from '../services/api';
import { exportToJSON } from '../services/exportUtils';

interface HistoryViewProps {
  onSelectResult: (response: PipelineExecutionResponse) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onSelectResult }) => {
  const [historyList, setHistoryList] = useState<PipelineExecutionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getHistory();
      setHistoryList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
          <History className="h-5 w-5 text-indigo-500" />
          <span>Evaluation History ({historyList.length})</span>
        </h3>
        <div className="flex items-center space-x-3">
          {historyList.length > 0 && (
            <button
              type="button"
              onClick={() => exportToJSON(historyList, 'rag_evaluation_history')}
              className="flex items-center space-x-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors font-semibold shadow-xs"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export History JSON</span>
            </button>
          )}
          <button
            onClick={loadHistory}
            className="flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-400 text-xs">Loading experiment history...</div>
      ) : historyList.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs">
          No previous experiments found. Submit a query to record history.
        </div>
      ) : (
        <div className="space-y-3">
          {historyList.map((item) => (
            <div
              key={item.query_id}
              onClick={() => onSelectResult(item)}
              className="bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between group shadow-xs"
            >
              <div className="space-y-1.5 max-w-2xl">
                <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">
                  "{item.query}"
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </span>
                  <span>•</span>
                  <span className="capitalize">Category: {item.query_classification?.query_type?.replace('_', ' ') || 'General'}</span>
                  <span>•</span>
                  <span>Latency: {item.total_pipeline_time.toFixed(2)}s</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Recommended</div>
                  <div className="text-xs font-bold text-indigo-600">
                    {item.final_judge.recommended_architecture}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
