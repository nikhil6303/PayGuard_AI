import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Layers,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Clock,
  XCircle,
  Bot,
  ArrowRight,
  Landmark,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Coins,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  CurrencyCode,
  ReconciliationItem,
  ReconciliationSummary,
} from '../../types';
import {
  formatCurrency,
  formatPercent,
  getSimplePaymentStatus,
  getStatusMeta,
} from '../../utils/formatters';

interface DashboardViewProps {
  summary: ReconciliationSummary | null;
  items: ReconciliationItem[];
  currency: CurrencyCode;
  onSelectException: (item: ReconciliationItem) => void;
  onNavigateTab: (tab: string) => void;
  onRunReconciliation: () => void;
  onAskAI: (item: ReconciliationItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  items,
  currency,
  onSelectException,
  onNavigateTab,
  onAskAI,
}) => {
  if (!summary) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4 text-center">
        <Layers className="h-10 w-10 text-slate-300 animate-pulse" />
        <p className="text-sm font-medium text-slate-600">
          Checking your payments automatically...
        </p>
      </div>
    );
  }

  // Focus exception for the AI investigation card
  const highlightedException =
    items.find((i) => i.status !== 'MATCHED' && i.severity === 'CRITICAL') ||
    items.find((i) => i.status !== 'MATCHED') ||
    items[0];

  // Filter for payments (All, Received in Bank, Waiting in Bank, Difference / Attention)
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'RECEIVED' | 'WAITING' | 'DIFFERENCE'>('ALL');

  // 1. Money to be Received: Total customer order value billed and expected
  const totalToBeReceived =
    items.reduce((sum, item) => sum + (item.order_amount || 0), 0) ||
    summary.total_transaction_value;

  // Expected net after standard processor fees
  const totalExpectedNet = items.reduce(
    (sum, item) => sum + (item.expected_settlement || item.order_amount || 0),
    0
  );

  // 2. Money Actually Received: Amount credited & verified into the bank
  const totalActuallyReceived = items.reduce((sum, item) => {
    if (item.status === 'MATCHED' || (item.settlement_amount !== null && item.status !== 'BANK_UNCREDITED')) {
      return sum + (item.bank_credit_amount || item.settlement_amount || item.payment_amount || item.order_amount || 0);
    }
    return sum;
  }, 0);

  // 3. Money Waiting to Deposit (In Transit / Scheduled Batch)
  const waitingInTransitItems = items.filter(
    (item) => item.status === 'MISSING_SETTLEMENT' || item.status === 'BANK_UNCREDITED'
  );
  const totalWaitingInTransit = waitingInTransitItems.reduce(
    (sum, item) => sum + (item.expected_settlement || item.order_amount || 0),
    0
  );

  // 4. Money with Discrepancies / Shortfalls
  const discrepancyItems = items.filter(
    (item) => item.difference > 0 && item.status !== 'MISSING_SETTLEMENT' && item.status !== 'BANK_UNCREDITED'
  );
  const totalDiscrepancies = discrepancyItems.reduce(
    (sum, item) => sum + item.difference,
    0
  );

  // Total difference gap between expected and received
  const totalDifferenceGap = Math.max(0, totalToBeReceived - totalActuallyReceived);

  // Count of items credited in bank
  const receivedItemsCount = items.filter(
    (i) => i.status === 'MATCHED' || (i.settlement_amount !== null && i.status !== 'BANK_UNCREDITED')
  ).length;

  // Percentages for the progress bar
  const receivedPercentage =
    totalToBeReceived > 0
      ? Math.min(100, Math.round((totalActuallyReceived / totalToBeReceived) * 100))
      : 0;

  const inTransitPercentage =
    totalToBeReceived > 0
      ? Math.min(100 - receivedPercentage, Math.round((totalWaitingInTransit / totalToBeReceived) * 100))
      : 0;

  const discrepancyPercentage = Math.max(
    0,
    100 - receivedPercentage - inTransitPercentage
  );

  // Filtered recent items based on user selection
  const filteredRecentItems = items.filter((item) => {
    if (paymentFilter === 'RECEIVED') {
      return item.settlement_amount !== null && item.status !== 'BANK_UNCREDITED';
    }
    if (paymentFilter === 'WAITING') {
      return item.status === 'MISSING_SETTLEMENT' || item.status === 'BANK_UNCREDITED';
    }
    if (paymentFilter === 'DIFFERENCE') {
      return item.difference > 0;
    }
    return true;
  });

  // Chart data for Matching Distribution
  const matchDistributionData = [
    { name: 'Matches', count: summary.matched_count, color: '#10B981' },
    { name: 'Needs Checking', count: summary.review_count, color: '#F59E0B' },
    { name: 'Clear Problems', count: summary.exception_count, color: '#EF4444' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Welcoming Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
          Welcome to PayGuard AI
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Your payments are being checked automatically.
        </p>
      </div>

      {/* 2. Four Simple Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Payments Checked */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
            Payments Checked
          </p>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            {summary.total_orders.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">
            Across customer orders and bank feeds
          </p>
        </div>

        {/* Card 2: Payments That Match */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
            Payments That Match
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 font-mono">
              {summary.matched_count.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">
              ({summary.match_rate}%)
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {summary.matched_count} out of {summary.total_orders} payments match
          </p>
        </div>

        {/* Card 3: Needs Attention */}
        <div
          onClick={() => onNavigateTab('exceptions')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1 cursor-pointer hover:border-red-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
              Needs Attention
            </p>
            {summary.exception_count > 0 && (
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
          <div className="text-3xl font-extrabold text-red-600 font-mono">
            {summary.exception_count}
          </div>
          <p className="text-xs text-red-600 font-medium">
            These payments need to be checked
          </p>
        </div>

        {/* Card 4: Money Available Now */}
        <div
          onClick={() => onNavigateTab('cash-position')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1 cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
            Money Available Now
          </p>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            {formatCurrency(summary.cash_position.available_cash, currency, true)}
          </div>
          <p className="text-xs text-slate-500">
            Confirmed in your bank account
          </p>
        </div>
      </div>

      {/* 3. Clear Highlight Banner */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-emerald-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {summary.matched_count} payments match. {summary.exception_count} payments need your attention.
            </h2>
            <p className="text-xs text-slate-600">
              Everything that matches has been separated from payments that have missing amounts or pending bank deposits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('exceptions')}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition-colors shrink-0"
          >
            <span>Review {summary.exception_count} Payments</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 4. Money to be Received vs. Money Actually Received Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-6">
        {/* Section Header */}
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
                Total from {summary.total_orders} customer orders
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
                {receivedItemsCount} of {summary.total_orders} payments
              </span>
            </div>
          </div>

          {/* Card 3: Difference / Waiting in Bank */}
          <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/60 via-amber-50/20 to-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Difference (Not in Bank Yet)
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
                <span className="font-semibold text-rose-600 font-mono">
                  {formatCurrency(totalDiscrepancies, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar & Breakdown */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <span className="font-bold text-slate-800">
              Payment Inflow Breakdown
            </span>
            <span className="text-slate-600">
              <strong className="text-emerald-700">{receivedPercentage}%</strong> received in bank •{' '}
              <strong className="text-amber-700">{inTransitPercentage}%</strong> waiting in transit •{' '}
              <strong className="text-rose-700">{discrepancyPercentage}%</strong> needs checking
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-3.5 w-full rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${receivedPercentage}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Received in bank: ${formatCurrency(totalActuallyReceived, currency)} (${receivedPercentage}%)`}
            />
            <div
              style={{ width: `${inTransitPercentage}%` }}
              className="bg-amber-400 transition-all duration-500"
              title={`Waiting to deposit: ${formatCurrency(totalWaitingInTransit, currency)} (${inTransitPercentage}%)`}
            />
            <div
              style={{ width: `${discrepancyPercentage}%` }}
              className="bg-rose-500 transition-all duration-500"
              title={`Needs attention: ${formatCurrency(totalDiscrepancies, currency)} (${discrepancyPercentage}%)`}
            />
          </div>

          {/* Legend and Interactive Filter Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200/60">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">
                  Received in Bank: <strong className="font-mono text-slate-900">{formatCurrency(totalActuallyReceived, currency)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-600">
                  Waiting to Deposit: <strong className="font-mono text-slate-900">{formatCurrency(totalWaitingInTransit, currency)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-600">
                  Needs Attention: <strong className="font-mono text-rose-600">{formatCurrency(totalDiscrepancies, currency)}</strong>
                </span>
              </div>
            </div>

            {/* Quick Filter Buttons to filter table below */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Filter Table:
              </span>
              {[
                { id: 'ALL', label: `All (${items.length})` },
                { id: 'RECEIVED', label: `Received (${receivedItemsCount})` },
                { id: 'WAITING', label: `Waiting (${waitingInTransitItems.length})` },
                { id: 'DIFFERENCE', label: `Difference (${discrepancyItems.length})` },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setPaymentFilter(btn.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    paymentFilter === btn.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Main Payment Table (2 cols) + AI Finance Assistant Box (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Payment Table */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[480px]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Recent Payments</h3>
                {paymentFilter !== 'ALL' && (
                  <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    Showing {paymentFilter === 'RECEIVED' ? 'Received in Bank' : paymentFilter === 'WAITING' ? 'Waiting to Deposit' : 'With Differences'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Click any payment to see what was supposed to happen and what reached the bank.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('reconciliation')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto max-h-[420px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-bold sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Customer Paid</th>
                  <th className="px-4 py-3">Bank Received</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {filteredRecentItems.slice(0, 10).map((item) => {
                  const simpleStatus = getSimplePaymentStatus(item);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectException(item)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-indigo-600 font-semibold">
                        {item.transaction_id}
                      </td>

                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {item.customer_name}
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-900 font-medium">
                        {formatCurrency(item.order_amount, currency)}
                      </td>

                      <td className="px-4 py-3 font-mono">
                        {item.settlement_amount !== null ? (
                          <span
                            className={
                              item.difference > 0 ? 'text-red-600 font-semibold' : 'text-slate-800'
                            }
                          >
                            {formatCurrency(item.settlement_amount, currency)}
                          </span>
                        ) : (
                          <span className="text-amber-600 italic font-sans font-medium">
                            Waiting
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${simpleStatus.badgeClass}`}
                        >
                          {simpleStatus.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: AI Finance Assistant + Activity History */}
        <div className="flex flex-col space-y-4">
          {/* AI Finance Assistant Card */}
          <div className="bg-slate-900 rounded-xl p-5 text-white flex-1 flex flex-col justify-between shadow-md border border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      AI Finance Assistant
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Payment {highlightedException?.transaction_id || 'ORD-10482'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-400/30">
                  Needs Check
                </span>
              </div>

              {/* Plain English explanation */}
              <div className="bg-slate-800/90 rounded-lg p-3.5 border-l-4 border-amber-500 text-xs space-y-1.5">
                <p className="text-amber-300 font-bold">
                  Why this payment doesn't match:
                </p>
                <p className="text-slate-200 leading-relaxed">
                  {highlightedException?.difference && highlightedException.difference > 0
                    ? `The customer paid ${formatCurrency(highlightedException.order_amount, currency)}, but only ${highlightedException.settlement_amount ? formatCurrency(highlightedException.settlement_amount, currency) : '₹0'} reached the bank. ${formatCurrency(highlightedException.difference, currency)} is missing.`
                    : highlightedException?.status === 'MISSING_SETTLEMENT'
                    ? `The customer paid ${formatCurrency(highlightedException.order_amount, currency)}, but this money has not reached the bank yet. We are still waiting for it.`
                    : 'The amounts between the customer checkout and bank deposit do not match. Check the payment details to confirm.'}
                </p>
              </div>

              {/* Recommended Action */}
              <div className="space-y-1 text-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  What you should do:
                </p>
                <p className="text-indigo-200 font-medium leading-relaxed">
                  {highlightedException?.recommended_action ||
                    'Check with the payment provider or confirm whether a fee was deducted.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (highlightedException) onAskAI(highlightedException);
              }}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Ask AI Finance Assistant</span>
            </button>
          </div>

          {/* Activity History Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">Activity History</h3>
              <button
                onClick={() => onNavigateTab('history')}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View all
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">
                    Payments checked automatically
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Verified {summary.total_orders} orders against bank records
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">
                    {summary.matched_count} payments matched
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Amounts received in bank match customer orders
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-700">
                    {summary.exception_count} payments need attention
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Separated for your review
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Operational Charts: Money Inflow & Growth & Payment Check Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Money Inflow Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Money Inflow & Growth
              </h2>
              <p className="text-xs text-slate-500">
                Money available now and expected from upcoming bank deposits
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('cash-position')}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <span>See Details</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={summary.cash_position.history}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val), currency), 'Money Available']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '11px',
                    border: '1px solid #334155',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cash"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cashGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Payment Check Summary Donut */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Payment Check Summary
            </h2>
            <p className="text-xs text-slate-500">
              Breakdown across {summary.total_orders} total payments
            </p>
          </div>

          <div className="h-36 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={matchDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {matchDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '11px',
                    border: '1px solid #334155',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Payments That Match</span>
              </div>
              <span className="font-bold text-slate-900 font-mono">
                {summary.matched_count} ({summary.match_rate}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-slate-600">Needs Checking</span>
              </div>
              <span className="font-bold text-slate-900 font-mono">
                {summary.review_count}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-slate-600">Needs Attention</span>
              </div>
              <span className="font-bold text-rose-600 font-mono">
                {summary.exception_count}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

