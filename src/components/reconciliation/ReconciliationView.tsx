import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Search,
  Filter,
  Download,
  Building,
  CreditCard,
  Receipt,
  Landmark,
  Clock,
  Sparkles,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import {
  CurrencyCode,
  ReconciliationItem,
  ReconciliationStatus,
  ReconciliationSummary,
  OrderRecord,
  PaymentRecord,
  SettlementRecord,
  BankTransactionRecord,
} from '../../types';
import {
  formatCurrency,
  getReviewStatusMeta,
  getSeverityMeta,
  getStatusMeta,
} from '../../utils/formatters';
import {
  parseOrdersCSV,
  parsePaymentsCSV,
  parseSettlementsCSV,
  parseBankStatementCSV,
} from '../../utils/fileParser';

interface ReconciliationViewProps {
  summary: ReconciliationSummary | null;
  items: ReconciliationItem[];
  currency: CurrencyCode;
  isRunningReconciliation: boolean;
  onRunReconciliation: () => void;
  onSelectException: (item: ReconciliationItem) => void;
  onAskAI: (item: ReconciliationItem) => void;
  onUploadDataset: (dataset: {
    orders?: OrderRecord[];
    payments?: PaymentRecord[];
    settlements?: SettlementRecord[];
    bankTransactions?: BankTransactionRecord[];
  }) => void;
  onNavigateToUpload?: () => void;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({
  summary,
  items,
  currency,
  isRunningReconciliation,
  onRunReconciliation,
  onSelectException,
  onAskAI,
  onUploadDataset,
  onNavigateToUpload,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSourceTab, setActiveSourceTab] = useState<'ALL' | 'ORDERS' | 'PAYMENTS' | 'SETTLEMENTS' | 'BANK'>('ALL');
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  // Calculations for Money Cards
  const totalToBeReceived =
    items.reduce((sum, item) => sum + (item.order_amount || 0), 0) ||
    (summary?.total_transaction_value || 0);

  const totalExpectedNet = items.reduce(
    (sum, item) => sum + (item.expected_settlement || item.order_amount || 0),
    0
  );

  const totalActuallyReceived = items.reduce((sum, item) => {
    if (item.status === 'MATCHED' || (item.settlement_amount !== null && item.status !== 'BANK_UNCREDITED')) {
      return sum + (item.bank_credit_amount || item.settlement_amount || item.payment_amount || item.order_amount || 0);
    }
    return sum;
  }, 0);

  const waitingInTransitItems = items.filter(
    (item) => item.status === 'MISSING_SETTLEMENT' || item.status === 'BANK_UNCREDITED'
  );
  const totalWaitingInTransit = waitingInTransitItems.reduce(
    (sum, item) => sum + (item.expected_settlement || item.order_amount || 0),
    0
  );

  const discrepancyItems = items.filter(
    (item) => item.difference > 0 && item.status !== 'MISSING_SETTLEMENT' && item.status !== 'BANK_UNCREDITED'
  );
  const totalDiscrepancies = discrepancyItems.reduce(
    (sum, item) => sum + item.difference,
    0
  );

  const totalDifferenceGap = Math.max(0, totalToBeReceived - totalActuallyReceived);

  const receivedItemsCount = items.filter(
    (i) => i.status === 'MATCHED' || (i.settlement_amount !== null && i.status !== 'BANK_UNCREDITED')
  ).length;

  const receivedPercentage =
    totalToBeReceived > 0
      ? Math.min(100, Math.round((totalActuallyReceived / totalToBeReceived) * 100))
      : 0;

  // Filter items based on active status filter & search query
  const filteredItems = items.filter((item) => {
    // Status / Tier matching
    if (activeFilter === 'MATCHED' && item.status !== 'MATCHED') return false;
    if (activeFilter === 'REVIEW' && item.status !== 'PARTIAL_MATCH' && item.status !== 'FEE_MISMATCH' && item.status !== 'TAX_MISMATCH') return false;
    if (activeFilter === 'EXCEPTION' && (item.status === 'MATCHED' || item.status === 'PARTIAL_MATCH' || item.status === 'FEE_MISMATCH' || item.status === 'TAX_MISMATCH')) return false;
    if (activeFilter === 'MISSING_PAYMENT' && item.status !== 'MISSING_PAYMENT') return false;
    if (activeFilter === 'MISSING_SETTLEMENT' && item.status !== 'MISSING_SETTLEMENT') return false;
    if (activeFilter === 'AMOUNT_MISMATCH' && item.status !== 'AMOUNT_MISMATCH') return false;
    if (activeFilter === 'DUPLICATE' && item.status !== 'DUPLICATE') return false;

    // Search query matching
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = item.transaction_id.toLowerCase().includes(q);
      const matchCust = item.customer_name.toLowerCase().includes(q);
      const matchPay = item.payment_id ? item.payment_id.toLowerCase().includes(q) : false;
      const matchGateway = item.gateway ? item.gateway.toLowerCase().includes(q) : false;
      if (!matchId && !matchCust && !matchPay && !matchGateway) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Check Payments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review matched transactions and check payment records against bank deposits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToUpload && (
            <button
              onClick={onNavigateToUpload}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <UploadCloud className="h-3.5 w-3.5 text-indigo-600" />
              <span>Upload Files</span>
            </button>
          )}
          <button
            onClick={onRunReconciliation}
            disabled={isRunningReconciliation}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isRunningReconciliation ? (
              <RotateCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-white" />
            )}
            <span>{isRunningReconciliation ? 'Checking...' : 'Check Payments'}</span>
          </button>
        </div>
      </div>

      {/* Money Cards Section: Money to be Received vs. Money Actually Received vs. Missing Money */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Landmark className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
                Money to be Received vs. Money Actually Received
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Compare customer payment orders against funds confirmed and credited into your bank account.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>{receivedPercentage}% Collected in Bank</span>
            </span>
          </div>
        </div>

        {/* 3 Main Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Money to be Received */}
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-indigo-50/20 to-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Money to be Received
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Receipt className="h-4 w-4" />
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {formatCurrency(totalToBeReceived, currency)}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Total from {summary?.total_orders || items.length} customer orders
              </p>
            </div>
            <div className="pt-3 border-t border-indigo-100/80 flex items-center justify-between text-xs">
              <span className="text-slate-500">Expected net after fees:</span>
              <span className="font-semibold text-slate-800 font-mono">
                {formatCurrency(totalExpectedNet, currency)}
              </span>
            </div>
          </div>

          {/* Card 2: Money Actually Received */}
          <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 via-emerald-50/20 to-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Money Actually Received
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">
                {formatCurrency(totalActuallyReceived, currency)}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Confirmed & credited in your bank
              </p>
            </div>
            <div className="pt-3 border-t border-emerald-100/80 flex items-center justify-between text-xs">
              <span className="text-slate-500">Verified bank deposits:</span>
              <span className="font-semibold text-emerald-700 font-mono">
                {receivedItemsCount} of {summary?.total_orders || items.length} payments
              </span>
            </div>
          </div>

          {/* Card 3: Missing Money / Difference (Not in Bank Yet) */}
          <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/60 via-amber-50/20 to-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Missing Money (Not in Bank Yet)
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-extrabold text-amber-700 font-mono tracking-tight">
                {formatCurrency(totalDifferenceGap, currency)}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Pending deposit or needs checking
              </p>
            </div>
            <div className="pt-3 border-t border-amber-100/80 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Waiting to deposit:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {formatCurrency(totalWaitingInTransit, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Needs attention / missing:</span>
                <span className="font-semibold text-red-600 font-mono">
                  {formatCurrency(totalDiscrepancies, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Reconciliation Table & Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden space-y-0">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Order ID, Customer, Gateway..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white pl-9 pr-4 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: `All (${items.length})` },
              { id: 'MATCHED', label: `Matches (${summary?.matched_count || 0})` },
              { id: 'REVIEW', label: `Needs Checking (${summary?.review_count || 0})` },
              { id: 'EXCEPTION', label: `Needs Attention (${summary?.exception_count || 0})` },
              { id: 'AMOUNT_MISMATCH', label: "Amount Doesn't Match" },
              { id: 'MISSING_SETTLEMENT', label: 'Waiting in Bank' },
              { id: 'DUPLICATE', label: 'Payment Appears Twice' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  activeFilter === filter.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* The Exact Reconciliation Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-bold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Payment ID</th>
                <th className="px-4 py-3">Customer Paid</th>
                <th className="px-4 py-3">Card / UPI</th>
                <th className="px-4 py-3">Money in Bank</th>
                <th className="px-4 py-3 text-right">Expected in Bank</th>
                <th className="px-4 py-3 text-right">Fee</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Match</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No transactions match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const statusMeta = getStatusMeta(item.status);
                  const isException = statusMeta.tier === 'EXCEPTION';
                  const isReview = statusMeta.tier === 'REVIEW';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectException(item)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        isException ? 'bg-red-50/15' : isReview ? 'bg-amber-50/15' : ''
                      }`}
                    >
                      {/* Transaction ID */}
                      <td className="px-4 py-3 font-semibold text-indigo-600 font-mono">
                        {item.transaction_id}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {item.customer_name}
                        </span>
                      </td>

                      {/* Order Status / Amount */}
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {formatCurrency(item.order_amount, currency)}
                        <span className="block text-[10px] text-slate-400">
                          {item.date}
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="px-4 py-3 font-mono">
                        {item.payment_amount !== null ? (
                          <>
                            <span className="text-slate-800 font-medium">
                              {formatCurrency(item.payment_amount, currency)}
                            </span>
                            <span className="block text-[10px] text-slate-400 truncate">
                              {item.gateway || 'Captured'}
                            </span>
                          </>
                        ) : (
                          <span className="font-bold text-red-600 text-[11px]">MISSING</span>
                        )}
                      </td>

                      {/* Settlement */}
                      <td className="px-4 py-3 font-mono">
                        {item.settlement_amount !== null ? (
                          <>
                            <span className="text-slate-800 font-medium">
                              {formatCurrency(item.settlement_amount, currency)}
                            </span>
                            <span className="block text-[10px] text-slate-400 truncate">
                              {item.settlement_id}
                            </span>
                          </>
                        ) : (
                          <span className="font-bold text-amber-600 text-[11px]">UNSETTLED</span>
                        )}
                      </td>

                      {/* Expected Net Amount */}
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
                        {formatCurrency(item.expected_settlement, currency)}
                        {item.difference > 0 && (
                          <span className="block text-[10px] font-bold text-red-600 font-mono">
                            Diff: -{formatCurrency(item.difference, currency)}
                          </span>
                        )}
                      </td>

                      {/* Fee */}
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {formatCurrency(item.fee, currency)}
                        <span className="block text-[10px] text-slate-400">
                          Exp: {formatCurrency(item.expected_fee, currency)}
                        </span>
                      </td>

                      {/* Status Indicator */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${statusMeta.badgeClass}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                          {statusMeta.label}
                        </span>
                      </td>

                      {/* Confidence Score */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold font-mono ${
                            item.confidence >= 95
                              ? 'bg-green-100 text-green-800'
                              : item.confidence >= 70
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.confidence}%
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectException(item)}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => onAskAI(item)}
                          className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                        >
                          Ask AI
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
