import React, { useState } from 'react';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  Bot,
  User,
  Cpu,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Layers,
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { AuditLogEntry, CurrencyCode, ReconciliationSummary } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface ReconciliationRunRecord {
  id: string;
  run_number: number;
  timestamp: string;
  trigger_type: 'Scheduled Cron' | 'Manual Ingestion' | 'File Upload' | 'Manual Re-run';
  total_records: number;
  orders_count: number;
  payments_count: number;
  settlements_count: number;
  bank_tx_count: number;
  match_rate: number;
  matched_count: number;
  exceptions_count: number;
  unreconciled_value: number;
  duration_ms: number;
  status: 'Completed' | 'Completed with Exceptions' | 'Failed';
}

interface HistoryViewProps {
  logs: AuditLogEntry[];
  summary: ReconciliationSummary | null;
  currency: CurrencyCode;
  onRunReconciliation?: () => void;
  onNavigateToExceptions?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  logs,
  summary,
  currency,
  onRunReconciliation,
  onNavigateToExceptions,
}) => {
  const [activeTab, setActiveTab] = useState<'runs' | 'events'>('runs');
  const [actorFilter, setActorFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Historical Run records
  const historicalRuns: ReconciliationRunRecord[] = [
    {
      id: 'RUN-20260902-04',
      run_number: 104,
      timestamp: summary?.reconciled_at || 'Today at 02:24 PM',
      trigger_type: 'Manual Re-run',
      total_records: summary ? summary.total_records : 115,
      orders_count: summary ? summary.total_orders : 35,
      payments_count: summary ? summary.total_payments : 32,
      settlements_count: summary ? summary.total_settlements : 26,
      bank_tx_count: summary ? summary.total_bank_txs : 22,
      match_rate: summary ? summary.match_rate : 84.4,
      matched_count: summary ? summary.matched_count : 24,
      exceptions_count: summary ? summary.exception_count : 18,
      unreconciled_value: summary ? summary.unreconciled_value : 424000,
      duration_ms: summary ? summary.processing_time_ms : 85,
      status: 'Completed with Exceptions',
    },
    {
      id: 'RUN-20260902-03',
      run_number: 103,
      timestamp: 'Today at 09:00 AM',
      trigger_type: 'Scheduled Cron',
      total_records: 112,
      orders_count: 34,
      payments_count: 31,
      settlements_count: 25,
      bank_tx_count: 22,
      match_rate: 85.3,
      matched_count: 29,
      exceptions_count: 5,
      unreconciled_value: 142000,
      duration_ms: 92,
      status: 'Completed with Exceptions',
    },
    {
      id: 'RUN-20260901-02',
      run_number: 102,
      timestamp: 'Yesterday at 06:30 PM',
      trigger_type: 'File Upload',
      total_records: 98,
      orders_count: 30,
      payments_count: 29,
      settlements_count: 21,
      bank_tx_count: 18,
      match_rate: 89.6,
      matched_count: 27,
      exceptions_count: 3,
      unreconciled_value: 86500,
      duration_ms: 78,
      status: 'Completed',
    },
    {
      id: 'RUN-20260901-01',
      run_number: 101,
      timestamp: 'Yesterday at 09:00 AM',
      trigger_type: 'Scheduled Cron',
      total_records: 94,
      orders_count: 28,
      payments_count: 28,
      settlements_count: 20,
      bank_tx_count: 18,
      match_rate: 92.8,
      matched_count: 26,
      exceptions_count: 2,
      unreconciled_value: 45000,
      duration_ms: 81,
      status: 'Completed',
    },
  ];

  // Filtered activity logs
  const filteredLogs = logs.filter((log) => {
    if (actorFilter !== 'ALL' && log.actor !== actorFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchDetails = log.details ? log.details.toLowerCase().includes(q) : false;
      const matchTarget = log.target_id ? log.target_id.toLowerCase().includes(q) : false;
      if (!matchAction && !matchDetails && !matchTarget) return false;
    }
    return true;
  });

  // Export History as CSV
  const handleExportHistory = () => {
    const headers = 'Run_ID,Timestamp,Trigger,Total_Records,Match_Rate,Exceptions_Count,Unreconciled_Value,Duration_MS,Status\n';
    const rows = historicalRuns
      .map(
        (r) =>
          `"${r.id}","${r.timestamp}","${r.trigger_type}",${r.total_records},"${r.match_rate}%",${r.exceptions_count},${r.unreconciled_value},${r.duration_ms},"${r.status}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reconciliation_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
              Past Checks & Activity History
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            See past payment checks and any actions taken by your team or the AI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportHistory}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Download History (CSV)</span>
          </button>

          {onRunReconciliation && (
            <button
              onClick={onRunReconciliation}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Check Payments Now</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Times Checked
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {historicalRuns.length}
            </span>
            <span className="text-xs text-emerald-600 font-medium">100% Success</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Daily automated & manual checks</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Average Match Rate
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">88.0%</span>
            <span className="text-xs text-slate-500">Across runs</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Payments that matched exactly</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Average Check Speed
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600">84 ms</span>
            <span className="text-xs text-emerald-600 font-medium">Fast</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Instant payment verification</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Actions Recorded
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{logs.length}</span>
            <span className="text-xs text-slate-500">Logged actions</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Complete record of every update</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('runs')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
            activeTab === 'runs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Past Payment Checks ({historicalRuns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
            activeTab === 'events'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Recent Actions & Changes ({logs.length})</span>
        </button>
      </div>

      {/* Tab 1: Reconciliation Runs */}
      {activeTab === 'runs' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Run Batch ID</th>
                    <th className="px-4 py-3">Trigger Type</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3 text-right">Ledger Records</th>
                    <th className="px-4 py-3 text-right">Match Rate</th>
                    <th className="px-4 py-3 text-right">Exceptions</th>
                    <th className="px-4 py-3 text-right">Unreconciled Value</th>
                    <th className="px-4 py-3 text-right">Execution Speed</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {historicalRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">
                            #{run.run_number}
                          </span>
                          <span className="text-indigo-600 font-semibold">{run.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-sans text-slate-700">
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {run.trigger_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-sans text-slate-500 text-[11px]">
                        {run.timestamp}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-800">
                        {run.total_records}
                        <span className="text-[10px] text-slate-400 block font-sans">
                          {run.orders_count}O • {run.payments_count}P • {run.settlements_count}S • {run.bank_tx_count}B
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-slate-900">{run.match_rate}%</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {run.exceptions_count > 0 ? (
                          <button
                            onClick={onNavigateToExceptions}
                            className="inline-flex items-center gap-1 font-bold text-red-600 hover:underline"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span>{run.exceptions_count}</span>
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-bold">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(run.unreconciled_value, currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-indigo-600 font-semibold">
                        {run.duration_ms} ms
                      </td>
                      <td className="px-4 py-3 text-center font-sans">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            run.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3 text-current" />
                          {run.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Activity & Resolution Timeline */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search event history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white pl-9 pr-4 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 text-xs">
              {['ALL', 'SYSTEM', 'AI_AGENT', 'CONTROLLER'].map((act) => (
                <button
                  key={act}
                  onClick={() => setActorFilter(act)}
                  className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase transition-colors ${
                    actorFilter === act
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {act.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Event Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Event Action</th>
                    <th className="px-4 py-3">Target Reference</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const isAgent = log.actor === 'AI_AGENT' || log.actor === 'PayGuard AI Agent';
                    const isSystem = log.actor === 'SYSTEM' || log.actor === 'System' || log.actor === 'Reconciliation Engine';

                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-slate-500 text-[11px]">
                          {log.timestamp}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${
                              isAgent
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : isSystem
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {isAgent ? (
                              <Bot className="h-3 w-3" />
                            ) : isSystem ? (
                              <Cpu className="h-3 w-3" />
                            ) : (
                              <User className="h-3 w-3" />
                            )}
                            {log.actor.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 font-mono">
                          {log.action}
                        </td>
                        <td className="px-4 py-3 font-mono text-indigo-600 font-semibold">
                          {log.target_id || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-md">
                          {log.details}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            {log.status || 'Verified'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
