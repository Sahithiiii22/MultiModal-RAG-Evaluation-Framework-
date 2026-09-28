import { PipelineExecutionResponse, BenchmarkResponse } from '../types';

/**
 * Downloads a string content as a client-side file.
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export single query comparison evaluation to CSV.
 */
export function exportComparisonToCSV(data: PipelineExecutionResponse) {
  const rows = [
    ['Query', `"${data.query.replace(/"/g, '""')}"`],
    ['Recommended Architecture', data.final_judge.recommended_architecture],
    ['Confidence', `${(data.confidence * 100).toFixed(0)}%`],
    ['Query Type', data.query_classification.query_type],
    ['Total Pipeline Time', `${data.total_pipeline_time}s`],
    [],
    ['Architecture', 'Status', 'Overall Score', 'Faithfulness', 'Answer Relevance', 'Context Relevance', 'Context Precision', 'Correctness', 'Total Time (s)', 'Retrieval Time (s)', 'Gen Time (s)', 'Retrieved Chunks', 'LLM Calls']
  ];

  Object.entries(data.evaluations).forEach(([arch, ev]) => {
    const res = data.rag_results[arch];
    rows.push([
      arch,
      res?.status || 'unknown',
      ev.overall_score.toFixed(3),
      `${(ev.faithfulness * 100).toFixed(0)}%`,
      `${(ev.answer_relevance * 100).toFixed(0)}%`,
      `${(ev.context_relevance * 100).toFixed(0)}%`,
      `${(ev.context_precision * 100).toFixed(0)}%`,
      ev.correctness !== null && ev.correctness !== undefined ? `${(ev.correctness * 100).toFixed(0)}%` : 'N/A',
      ev.total_response_time.toFixed(2),
      ev.retrieval_latency.toFixed(2),
      ev.generation_latency.toFixed(2),
      ev.num_retrieved_chunks.toString(),
      ev.num_llm_calls.toString()
    ]);
  });

  const csvContent = rows.map(r => r.join(',')).join('\n');
  const filename = `rag_evaluation_${data.query_id.slice(0, 8)}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export single query comparison evaluation to publication-ready Markdown report.
 */
export function exportComparisonToMarkdown(data: PipelineExecutionResponse) {
  let md = `# RAG Architecture Evaluation & Trade-off Report\n\n`;
  md += `**Query**: ${data.query}\n\n`;
  md += `**Timestamp**: ${data.timestamp}\n\n`;
  md += `**Query Classification**: \`${data.query_classification.query_type}\` (Complexity: \`${data.query_classification.complexity}\`)\n\n`;
  md += `**Recommended Winner**: **${data.final_judge.recommended_architecture}** (Confidence: ${(data.confidence * 100).toFixed(0)}%)\n\n`;
  md += `### Final Judge Justification\n> ${data.rag_reason}\n\n`;

  md += `### Multi-Architecture Performance Matrix\n\n`;
  md += `| Architecture | Overall Score | Faithfulness | Ans Relevance | Ctx Relevance | Ctx Precision | Total Latency |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  Object.entries(data.evaluations).forEach(([arch, ev]) => {
    const isWinner = arch === data.final_judge.recommended_architecture ? ' 🏆' : '';
    md += `| **${arch}${isWinner}** | ${ev.overall_score.toFixed(3)} | ${(ev.faithfulness * 100).toFixed(0)}% | ${(ev.answer_relevance * 100).toFixed(0)}% | ${(ev.context_relevance * 100).toFixed(0)}% | ${(ev.context_precision * 100).toFixed(0)}% | ${ev.total_response_time.toFixed(2)}s |\n`;
  });

  md += `\n### Trade-off Analysis\n\n`;
  Object.entries(data.final_judge.tradeoff_analysis).forEach(([comparison, reason]) => {
    md += `- **${comparison}**: ${reason}\n`;
  });

  md += `\n### Generated Answers by Architecture\n\n`;
  Object.entries(data.rag_results).forEach(([arch, res]) => {
    md += `#### ${arch} (${res.total_time.toFixed(2)}s)\n`;
    md += `${res.answer}\n\n`;
  });

  const filename = `rag_evaluation_report_${data.query_id.slice(0, 8)}.md`;
  downloadFile(md, filename, 'text/markdown;charset=utf-8;');
}

/**
 * Export Batch Benchmark Suite results to CSV.
 */
export function exportBenchmarkToCSV(benchmark: BenchmarkResponse) {
  const rows = [
    ['Benchmark ID', benchmark.benchmark_id],
    ['Timestamp', benchmark.timestamp],
    ['Total Queries Evaluated', benchmark.total_queries.toString()],
    [],
    ['=== SUMMARY BY ARCHITECTURE ==='],
    ['Architecture', 'Win Rate (%)', 'Win Count', 'Avg Overall Score', 'Avg Faithfulness (%)', 'Avg Ans Relevance (%)', 'Avg Ctx Relevance (%)', 'Avg Latency (s)'],
  ];

  benchmark.summaries.forEach(s => {
    rows.push([
      s.architecture,
      s.win_rate_percent.toFixed(1),
      s.win_count.toString(),
      s.avg_overall_score.toFixed(3),
      (s.avg_faithfulness * 100).toFixed(0),
      (s.avg_answer_relevance * 100).toFixed(0),
      (s.avg_context_relevance * 100).toFixed(0),
      s.avg_latency_sec.toFixed(2)
    ]);
  });

  rows.push([]);
  rows.push(['=== PER-QUERY DETAILED RESULTS ===']);
  rows.push(['Query ID', 'Query', 'Recommended Winner', 'Confidence', 'Total Latency (s)']);

  benchmark.query_results.forEach(q => {
    rows.push([
      q.query_id.slice(0, 8),
      `"${q.query.replace(/"/g, '""')}"`,
      q.final_judge.recommended_architecture,
      `${(q.confidence * 100).toFixed(0)}%`,
      q.total_pipeline_time.toFixed(2)
    ]);
  });

  const csvContent = rows.map(r => r.join(',')).join('\n');
  const filename = `rag_benchmark_${benchmark.benchmark_id.slice(0, 8)}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export Batch Benchmark Suite to Markdown Report.
 */
export function exportBenchmarkToMarkdown(benchmark: BenchmarkResponse) {
  let md = `# Empirical RAG Benchmark Suite Report\n\n`;
  md += `**Benchmark ID**: \`${benchmark.benchmark_id}\`\n\n`;
  md += `**Timestamp**: ${benchmark.timestamp}\n\n`;
  md += `**Total Queries Evaluated**: ${benchmark.total_queries}\n\n`;

  md += `## 1. Empirical Architecture Win Rates & Averages\n\n`;
  md += `| Architecture | Win Rate (%) | Wins | Avg Score | Avg Faithfulness | Avg Latency |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;

  benchmark.summaries.forEach(s => {
    md += `| **${s.architecture}** | ${s.win_rate_percent.toFixed(1)}% | ${s.win_count} | ${s.avg_overall_score.toFixed(3)} | ${(s.avg_faithfulness * 100).toFixed(0)}% | ${s.avg_latency_sec.toFixed(2)}s |\n`;
  });

  md += `\n## 2. Detailed Per-Query Results\n\n`;
  benchmark.query_results.forEach((q, idx) => {
    md += `### Query ${idx + 1}: "${q.query}"\n`;
    md += `- **Winner**: **${q.final_judge.recommended_architecture}** (Confidence: ${(q.confidence * 100).toFixed(0)}%)\n`;
    md += `- **Category**: \`${q.query_classification.query_type}\` | **Pipeline Time**: ${q.total_pipeline_time.toFixed(2)}s\n`;
    md += `- **Rationale**: ${q.rag_reason}\n\n`;
  });

  const filename = `rag_benchmark_report_${benchmark.benchmark_id.slice(0, 8)}.md`;
  downloadFile(md, filename, 'text/markdown;charset=utf-8;');
}

/**
 * Export raw JSON data.
 */
export function exportToJSON(data: any, prefix = 'rag_export') {
  const jsonContent = JSON.stringify(data, null, 2);
  const filename = `${prefix}_${Date.now()}.json`;
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
}
