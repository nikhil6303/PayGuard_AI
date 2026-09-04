import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Building,
  CreditCard,
  Receipt,
  Layers,
  ChevronRight
} from 'lucide-react';
import {
  CurrencyCode,
  ReconciliationItem,
  ReconciliationSeverity,
  ReconciliationStatus,
  ReconciliationSummary,
  ReviewStatus,
} from '../../types';
import {
  formatCurrency,
  getReviewStatusMeta,
  getSeverityMeta,
  getStatusMeta,
} from '../../utils/formatters';

interface ExceptionsViewProps {
  summary: ReconciliationSummary | null;
  items: ReconciliationItem[];
  currency: CurrencyCode;
  onSelectException: (item: ReconciliationItem) => void;
  onAskAI: (item: ReconciliationItem) => void;
  onBatchUpdateStatus: (ids: string[], status: ReviewStatus) => void;
}

export const ExceptionsView: React.FC<ExceptionsViewProps> = ({
  summary,
  items,
  currency,
  onSelectException,
  onAskAI,
  onBatchUpdateStatus,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract all non-matched items
  const allExceptions = items.filter((i) => i.status !== 'MATCHED');

  // Compute counts for the requested simple categories:
  // Money Missing: amount mismatch where difference > 0 or missing payment
  const countMoneyMissing = allExceptions.filter(
    (i) => i.difference > 0 || i.status === 'MISSING_PAYMENT'
  ).length;
  // Money Not Received: missing settlement or bank uncredited
  const countMoneyNotReceived = allExceptions.filter(
    (i) => i.status === 'MISSING_SETTLEMENT' || i.status === 'BANK_UNCREDITED'
  ).length;
  // Amount Doesn't Match: AMOUNT_MISMATCH
  const countAmountMismatch = allExceptions.filter(
    (i) => i.status === 'AMOUNT_MISMATCH'
  ).length;
  // Payment Appears Twice: DUPLICATE
  const countDuplicate = allExceptions.filter(
    (i) => i.status === 'DUPLICATE'
  ).length;
  // Fee Doesn't Match: FEE_MISMATCH
  const countFeeMismatch = allExceptions.filter(
    (i) => i.status === 'FEE_MISMATCH'
  ).length;

  const categories = [
    { id: 'ALL', label: 'All Payments Needing Attention', count: allExceptions.length },
    { id: 'MONEY_MISSING', label: 'Money Missing', count: countMoneyMissing },
    { id: 'MONEY_NOT_RECEIVED', label: 'Money Not Received', count: countMoneyNotReceived },
    { id: 'AMOUNT_MISMATCH', label: "Amount Doesn't Match", count: countAmountMismatch },
    { id: 'DUPLICATE', label: 'Payment Appears Twice', count: countDuplicate },
    { id: 'FEE_MISMATCH', label: "Fee Doesn't Match", count: countFeeMismatch },
  ];

  // Filter based on selected category & search query
  const filteredExceptions = allExceptions.filter((item) => {
    if (selectedCategory === 'MONEY_MISSING') {
      if (item.difference <= 0 && item.status !== 'MISSING_PAYMENT') return false;
    } else if (selectedCategory === 'MONEY_NOT_RECEIVED') {
      if (item.status !== 'MISSING_SETTLEMENT' && item.status !== 'BANK_UNCREDITED') return false;
    } else if (selectedCategory === 'AMOUNT_MISMATCH') {
      if (item.status !== 'AMOUNT_MISMATCH') return false;
    } else if (selectedCategory === 'DUPLICATE') {
      if (item.status !== 'DUPLICATE') return false;
    } else if (selectedCategory === 'FEE_MISMATCH') {
      if (item.status !== 'FEE_MISMATCH') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = item.transaction_id.toLowerCase().includes(q);
      const matchCust = item.customer_name.toLowerCase().includes(q);
      const matchCause = item.likely_cause.toLowerCase().includes(q);
      if (!matchId && !matchCust && !matchCause) return false;
    }

    return true;
  });

  const totalDifferenceInView = filteredExceptions.reduce((sum, item) => sum + item.difference, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
              Needs Attention
            </h1>
            <p className="text-sm text-slate-600 font-medium">
              These payments have something that needs to be checked.
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Difference
              </span>
              <span className="text-lg font-extrabold text-red-600 font-mono">
                {formatCurrency(totalDifferenceInView || summary?.unreconciled_value, currency)}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Payments to Check
              </span>
              <span className="text-lg font-extrabold text-slate-900 font-mono">
                {filteredExceptions.length}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Simple Category Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs text-slate-500 font-medium line-clamp-1 w-full">
                  {cat.label}
                </span>
                <span className="text-xl font-extrabold font-mono mt-1 text-slate-900">
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search payments by ID, customer name, or issue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <p className="text-xs text-slate-500 hidden sm:block">
          Showing <strong className="text-slate-800">{filteredExceptions.length}</strong> payments
        </p>
      </div>

      {/* 4. Simple English Payments Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-bold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Payment ID</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5 text-right">Customer Paid</th>
                <th className="px-4 py-3.5 text-right">Money in Bank</th>
                <th className="px-4 py-3.5 text-right">Difference</th>
                <th className="px-4 py-3.5">Why It Needs Attention</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExceptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No payments found matching your filter. Everything in this category is clear!
                  </td>
                </tr>
              ) : (
                filteredExceptions.map((item) => {
                  const statusMeta = getStatusMeta(item.status);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectException(item)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5 font-semibold text-indigo-600 font-mono">
                        {item.transaction_id}
                      </td>

                      <td className="px-4 py-3.5 text-slate-800 font-medium">
                        {item.customer_name}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-800">
                        {formatCurrency(item.order_amount, currency)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                        {item.settlement_amount !== null ? (
                          formatCurrency(item.settlement_amount, currency)
                        ) : (
                          <span className="text-amber-600 italic font-sans font-medium">
                            Not Received Yet
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold">
                        {item.difference > 0 ? (
                          <span className="text-red-600">
                            {formatCurrency(item.difference, currency)}
                          </span>
                        ) : (
                          <span className="text-slate-400">₹0</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 max-w-xs text-slate-600">
                        <p className="line-clamp-1 font-medium text-slate-800">
                          {statusMeta.humanDescription}
                        </p>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {item.likely_cause}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>

                      <td
                        className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onSelectException(item)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => onAskAI(item)}
                          className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
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
