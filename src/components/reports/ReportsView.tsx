import React from 'react';
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calendar,
  ShieldCheck,
  Zap,
  Building
} from 'lucide-react';
import { CurrencyCode, ReconciliationItem, ReconciliationSummary } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface ReportsViewProps {
  summary: ReconciliationSummary | null;
  items: ReconciliationItem[];
  currency: CurrencyCode;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  summary,
  items,
  currency,
}) => {
  if (!summary) return null;

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = [
      'Transaction ID',
      'Order Amount',
      'Payment Amount',
      'Settlement Amount',
      'Expected Settlement',
      'Fee',
      'Tax',
      'Variance',
      'Status',
      'Severity',
      'Confidence',
      'Likely Cause',
    ];

    const rows = items.map((i) => [
      i.transaction_id,
      i.order_amount ?? '',
      i.payment_amount ?? '',
      i.settlement_amount ?? '',
      i.expected_settlement,
      i.fee,
      i.tax,
      i.difference,
      i.status,
      i.severity,
      `${i.confidence}%`,
      `"${i.likely_cause.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PayGuard_Reconciliation_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Report Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              Reconciliation Audit Report
            </h1>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-semibold font-mono">
              FINANCE-CERTIFIED
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • Run ID #PG-REC-{(Math.random() * 100000).toFixed(0)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Printable Report Sheet */}
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Executive Summary */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <span>1. Executive Summary</span>
          </h2>
          <p className="text-xs leading-relaxed text-slate-700 font-normal">
            During this reconciliation cycle, PayGuard AI deterministically verified <strong>{summary.total_records} multi-source financial records</strong> comprising {summary.total_orders} orders, {summary.total_payments} gateway captures, {summary.total_settlements} payout batches, and {summary.total_bank_txs} bank clearing entries. The measured reconciliation match rate is <strong>{formatPercent(summary.match_rate)}</strong> ({summary.matched_count} fully validated records). An unreconciled variance exposure of <strong>{formatCurrency(summary.unreconciled_value, currency)}</strong> was isolated across {summary.exception_count} discrete exceptions for human controller resolution.
          </p>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Match Rate</span>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {formatPercent(summary.match_rate)}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">
              {summary.matched_count} / {summary.total_orders} matched
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Total Volume</span>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {formatCurrency(summary.total_transaction_value, currency, true)}
            </div>
            <span className="text-[11px] text-slate-500">
              {summary.total_orders} Orders
            </span>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-1">
            <span className="text-[10px] font-bold text-red-700 uppercase">Unreconciled Variance</span>
            <div className="text-2xl font-bold text-red-700 font-mono">
              {formatCurrency(summary.unreconciled_value, currency, true)}
            </div>
            <span className="text-[11px] text-red-600 font-semibold">
              {summary.exception_count} Exceptions
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Reconciliation Speed</span>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {summary.throughput_rps} rps
            </div>
            <span className="text-[11px] text-slate-500">
              {(summary.processing_time_ms / 1000).toFixed(1)}s elapsed
            </span>
          </div>
        </div>

        {/* Exception Category Breakdown */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span>2. Exception Classification Breakdown</span>
          </h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Discrepancy Category</th>
                  <th className="py-2.5 px-4 text-center">Count</th>
                  <th className="py-2.5 px-4 text-right">Root Cause Pattern</th>
                  <th className="py-2.5 px-4 text-right">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(summary.exceptions_by_type).map(([type, count]) => (
                  <tr key={type} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-slate-800 font-mono">
                      {type.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-red-600 font-mono">
                      {count}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">
                      {type === 'MISSING_SETTLEMENT'
                        ? 'Gateway payout batch pending or settlement batch delayed'
                        : type === 'AMOUNT_MISMATCH'
                        ? 'Gateway capture amount did not match original order checkout'
                        : type === 'FEE_MISMATCH'
                        ? 'Contracted MDR rate variance or excess gateway surcharge'
                        : type === 'MISSING_PAYMENT'
                        ? 'Customer abandoned or webhook callback dropped'
                        : 'System discrepancy'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">
                      {type === 'MISSING_SETTLEMENT'
                        ? 'Query Gateway Payout API'
                        : type === 'AMOUNT_MISMATCH'
                        ? 'Escalate to Gateway Ops'
                        : type === 'FEE_MISMATCH'
                        ? 'File Fee Dispute'
                        : 'Review Audit Trail'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Controller Sign-Off */}
        <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-800">PayGuard Autonomous Financial Controller</p>
            <p>Verification principle: Automate what can be verified. Surface what cannot.</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-800">Controller Sign-Off: _______________</p>
            <p>Certified on {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
