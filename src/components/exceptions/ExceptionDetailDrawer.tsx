import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  CreditCard,
  Receipt,
  Scale,
  Send
} from 'lucide-react';
import { CurrencyCode, ReconciliationItem, ReviewStatus } from '../../types';
import {
  formatCurrency,
  getReviewStatusMeta,
  getSeverityMeta,
  getStatusMeta,
} from '../../utils/formatters';

interface ExceptionDetailDrawerProps {
  item: ReconciliationItem | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: ReviewStatus) => void;
  onAskAI: (item: ReconciliationItem) => void;
  currency: CurrencyCode;
}

export const ExceptionDetailDrawer: React.FC<ExceptionDetailDrawerProps> = ({
  item,
  onClose,
  onUpdateStatus,
  onAskAI,
  currency,
}) => {
  if (!item) return null;

  const statusMeta = getStatusMeta(item.status);
  const severityMeta = getSeverityMeta(item.severity);
  const reviewMeta = getReviewStatusMeta(item.review_status);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
        {/* Backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl border-l border-slate-200 overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 font-mono uppercase tracking-wider">
                  Exception #{item.transaction_id.replace('ORD-', 'EX-')}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${statusMeta.badgeClass}`}
                >
                  {statusMeta.label}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase border ${severityMeta.badgeClass}`}
                >
                  {severityMeta.label} Severity
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 font-['Plus_Jakarta_Sans']">
                {item.transaction_id} — Investigation
              </h2>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. Cross-Source Multi-Ledger Comparison */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Multi-Source Financial Comparison
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 mb-1">
                    <Building className="h-3 w-3" />
                    <span>ORDER</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 font-mono">
                    {formatCurrency(item.order_amount, currency)}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {item.customer_name}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 mb-1">
                    <CreditCard className="h-3 w-3" />
                    <span>PAYMENT</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 font-mono">
                    {item.payment_amount !== null ? formatCurrency(item.payment_amount, currency) : 'Missing'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {item.gateway || 'None'}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 mb-1">
                    <Receipt className="h-3 w-3" />
                    <span>SETTLEMENT</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 font-mono">
                    {item.settlement_amount !== null ? formatCurrency(item.settlement_amount, currency) : 'Missing'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {item.settlement_id || 'Unsettled'}
                  </div>
                </div>

                <div className="rounded-lg bg-indigo-50/70 p-2.5 border border-indigo-200">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-indigo-700 mb-1">
                    <Scale className="h-3 w-3" />
                    <span>EXPECTED</span>
                  </div>
                  <div className="text-sm font-bold text-indigo-900 font-mono">
                    {formatCurrency(item.expected_settlement, currency)}
                  </div>
                  <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                    MDR 2.0% + 18% GST
                  </div>
                </div>
              </div>

              {/* Difference Banner */}
              {item.difference > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-rose-50 border border-rose-200 px-3.5 py-2 text-xs">
                  <span className="font-semibold text-rose-800">
                    Unreconciled Variance (Difference):
                  </span>
                  <span className="font-extrabold text-rose-700 font-mono text-sm">
                    {formatCurrency(item.difference, currency)}
                  </span>
                </div>
              )}
            </div>

            {/* 2. AI Finding Card */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span>AI Finding & Root Cause</span>
                </div>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800 font-mono">
                  {item.confidence}% Match Evidence
                </span>
              </div>
              <p className="text-xs leading-relaxed text-indigo-950 font-medium">
                {item.likely_cause}
              </p>
            </div>

            {/* 3. Evidence Checklist (✓ / ✗) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Four-Way Reconciliation Evidence Checklist
              </h3>
              <div className="space-y-2">
                {item.evidence.map((ev) => (
                  <div
                    key={ev.id}
                    className={`flex items-start gap-2.5 rounded-lg p-2.5 text-xs transition-colors ${
                      ev.passed ? 'bg-emerald-50/60 text-emerald-900 border border-emerald-100' : 'bg-rose-50/60 text-rose-900 border border-rose-100'
                    }`}
                  >
                    {ev.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <p className="font-semibold">{ev.label}</p>
                      <p className="text-[11px] text-slate-600 font-normal">{ev.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Recommended Action */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span>Recommended Action for Controller</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-normal">
                {item.recommended_action}
              </p>
            </div>

            {/* Raw identifiers */}
            <div className="text-[11px] text-slate-400 space-y-1 font-mono">
              <p>Order ID: {item.order_id || 'N/A'}</p>
              <p>Payment ID: {item.payment_id || 'N/A'}</p>
              <p>Settlement ID: {item.settlement_id || 'N/A'}</p>
              <p>Bank Reference: {item.raw_settlement?.settlement_ref || 'N/A'}</p>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="border-t border-slate-200 bg-white p-4 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <button
                id="btn-drawer-review"
                onClick={() => onUpdateStatus(item.id, 'REVIEWED')}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  item.review_status === 'REVIEWED'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Mark Reviewed
              </button>

              <button
                id="btn-drawer-escalate"
                onClick={() => onUpdateStatus(item.id, 'ESCALATED')}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  item.review_status === 'ESCALATED'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Escalate
              </button>

              <button
                id="btn-drawer-ignore"
                onClick={() => onUpdateStatus(item.id, 'IGNORED')}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  item.review_status === 'IGNORED'
                    ? 'bg-slate-700 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Ignore
              </button>

              <button
                id="btn-drawer-ask-ai"
                onClick={() => onAskAI(item)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ask AI</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
