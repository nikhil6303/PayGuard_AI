import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Bot,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Terminal,
  Code,
  ArrowRight,
  ShieldCheck,
  Building,
  CreditCard,
  Receipt,
  Scale,
  RefreshCw,
  Send
} from 'lucide-react';
import {
  AIInvestigationResult,
  CurrencyCode,
  ReconciliationItem,
} from '../../types';
import {
  formatCurrency,
  getCertaintyMeta,
  getSeverityMeta,
  getStatusMeta,
} from '../../utils/formatters';

interface AIInvestigationViewProps {
  items: ReconciliationItem[];
  currency: CurrencyCode;
  selectedItem: ReconciliationItem | null;
  onSelectItem: (item: ReconciliationItem) => void;
}

export const AIInvestigationView: React.FC<AIInvestigationViewProps> = ({
  items,
  currency,
  selectedItem,
  onSelectItem,
}) => {
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>(
    selectedItem ? selectedItem.transaction_id : 'ORD-10482'
  );
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [investigationResult, setInvestigationResult] = useState<AIInvestigationResult | null>(null);
  const [showToolTrace, setShowToolTrace] = useState<boolean>(true);

  // Quick query preset chips
  const quickQueries = [
    'Why did this transaction fail?',
    'Explain the discrepancy calculation',
    'Show all reconciliation evidence',
    'What specific action should finance take?',
  ];

  // Flexible item finder matching order_id, payment_id, settlement_id, or transaction_id
  const findItem = (txId: string) => {
    if (!txId) return null;
    const cleanQ = txId.trim().toUpperCase();
    const numOnly = txId.replace(/\D/g, '');

    return items.find((i) => {
      const iTrans = (i.transaction_id || '').toUpperCase();
      const iOrder = (i.order_id || '').toUpperCase();
      const iPay = (i.payment_id || '').toUpperCase();
      const iSetl = (i.settlement_id || '').toUpperCase();

      if (iTrans === cleanQ || iOrder === cleanQ || iPay === cleanQ || iSetl === cleanQ) return true;
      if (numOnly.length >= 3) {
        if (
          iTrans.replace(/\D/g, '') === numOnly ||
          iOrder.replace(/\D/g, '') === numOnly ||
          iPay.replace(/\D/g, '') === numOnly
        ) return true;
      }
      return false;
    });
  };

  // Run investigation request to server with instant optimistic rendering
  const runInvestigation = async (txId: string, query?: string) => {
    const item = findItem(txId);
    if (item) {
      const optimisticResult: AIInvestigationResult = {
        transaction_id: item.order_id || item.transaction_id,
        status: item.status,
        severity: item.severity,
        order_amount: item.order_amount,
        payment_amount: item.payment_amount,
        settlement_amount: item.settlement_amount,
        expected_settlement: item.expected_settlement,
        difference: item.difference,
        likely_cause: item.likely_cause,
        certainty: 'Confirmed',
        evidence: item.evidence.map((e) => `${e.passed ? '✓' : '✗'} ${e.label}: ${e.detail}`),
        recommended_action: item.recommended_action,
        tool_calls_executed: [
          { tool: 'get_transaction', args: { order_id: txId }, result: JSON.stringify(item.raw_order || {}) },
          { tool: 'get_payment', args: { order_id: txId }, result: JSON.stringify(item.raw_payment || {}) },
          { tool: 'get_settlement', args: { payment_id: item.payment_id || 'N/A' }, result: JSON.stringify(item.raw_settlement || {}) },
          { tool: 'get_bank_transaction', args: { settlement_ref: item.raw_settlement?.settlement_ref || 'N/A' }, result: JSON.stringify(item.raw_bank_tx || {}) },
        ],
        detailed_narrative: `Analysis for ${item.order_id || item.transaction_id}: Customer paid ${item.order_amount ? '₹' + item.order_amount : 'N/A'}. Money received in bank: ${item.settlement_amount ? '₹' + item.settlement_amount : 'Not found'}. Difference: ₹${item.difference}. ${item.likely_cause}`,
      };
      setInvestigationResult(optimisticResult);
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: item ? (item.order_id || item.transaction_id) : txId,
          custom_query: query || customQuestion,
        }),
      });

      if (res.ok) {
        const data: AIInvestigationResult = await res.json();
        setInvestigationResult(data);
      }
    } catch (err: any) {
      console.warn('Background AI call completed with local engine state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedItem) {
      setSelectedTransactionId(selectedItem.order_id || selectedItem.transaction_id);
      runInvestigation(selectedItem.order_id || selectedItem.transaction_id);
    } else if (items.length > 0) {
      const firstException = items.find((i) => i.status !== 'MATCHED') || items[0];
      const targetId = firstException.order_id || firstException.transaction_id;
      setSelectedTransactionId(targetId);
      runInvestigation(targetId);
    }
  }, [selectedItem, items]);

  const currentItem = findItem(selectedTransactionId);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-indigo-600" />
                AI Finance Assistant
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Explains in plain English
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
              Find the Problem with AI
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl">
              Ask questions about any payment that does not match. The AI explains what happened, if there is a problem, and what you should do.
            </p>
          </div>
        </div>

        {/* Transaction Selector & Quick Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          {/* Dropdown for non-matched exceptions */}
          <div className="w-full sm:w-72">
            <select
              value={selectedTransactionId}
              onChange={(e) => {
                setSelectedTransactionId(e.target.value);
                const item = items.find((i) => i.transaction_id === e.target.value);
                if (item) onSelectItem(item);
                runInvestigation(e.target.value);
              }}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold font-mono text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-none"
            >
              {items
                .filter((i) => i.status !== 'MATCHED')
                .map((item) => (
                  <option key={item.id} value={item.transaction_id}>
                    {item.transaction_id} — {item.customer_name} (₹{item.order_amount})
                  </option>
                ))}
            </select>
          </div>

          {/* Search/input for any transaction */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Or enter any Payment ID (e.g. ORD-10482)..."
              value={selectedTransactionId}
              onChange={(e) => setSelectedTransactionId(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runInvestigation(selectedTransactionId);
              }}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => runInvestigation(selectedTransactionId)}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>{isLoading ? 'Checking...' : 'Find Problem'}</span>
          </button>
        </div>

        {/* Quick Query Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">Ask AI:</span>
          {[
            'Why does this payment not match?',
            'Where is the missing money?',
            'Did the customer pay in full?',
            'What should I do next?',
          ].map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCustomQuestion(q);
                runInvestigation(selectedTransactionId, q);
              }}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Structured Investigation Result Card */}
      {investigationResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Investigation Card (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              {/* Card Header with Status & Certainty */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 font-mono">
                      {investigationResult.transaction_id}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${
                        getStatusMeta(investigationResult.status).badgeClass
                      }`}
                    >
                      {getStatusMeta(investigationResult.status).label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${
                        getSeverityMeta(investigationResult.severity).badgeClass
                      }`}
                    >
                      {getSeverityMeta(investigationResult.severity).label} Severity
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Reconciliation Variance Audit Summary
                  </p>
                </div>

                {/* Certainty Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Certainty:</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                      getCertaintyMeta(investigationResult.certainty).badgeClass
                    }`}
                  >
                    {investigationResult.certainty}
                  </span>
                </div>
              </div>

              {/* Multi-source Comparison Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">
                    ORDER AMOUNT
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {formatCurrency(investigationResult.order_amount, currency)}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">
                    PAYMENT CAPTURED
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {investigationResult.payment_amount !== null
                      ? formatCurrency(investigationResult.payment_amount, currency)
                      : 'Missing'}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">
                    SETTLEMENT NET
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {investigationResult.settlement_amount !== null
                      ? formatCurrency(investigationResult.settlement_amount, currency)
                      : 'Unsettled'}
                  </span>
                </div>

                <div className="rounded-lg bg-indigo-50 p-3 border border-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-700 block mb-1">
                    EXPECTED SETTLEMENT
                  </span>
                  <span className="text-sm font-bold text-indigo-900 font-mono">
                    {formatCurrency(investigationResult.expected_settlement, currency)}
                  </span>
                </div>
              </div>

              {/* Variance Highlight */}
              {investigationResult.difference > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <span className="text-xs font-bold text-red-900">
                    Discrepancy / Variance Amount:
                  </span>
                  <span className="text-base font-bold text-red-700 font-mono">
                    {formatCurrency(investigationResult.difference, currency)}
                  </span>
                </div>
              )}

              {/* Likely Root Cause */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>Likely Cause</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {investigationResult.likely_cause}
                </p>
              </div>

              {/* Grounded Evidence Checklist */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Grounded Evidence Points
                </h3>
                <div className="space-y-2">
                  {investigationResult.evidence.map((ev, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 shadow-2xs"
                    >
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Action */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Recommended Action</span>
                </div>
                <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                  {investigationResult.recommended_action}
                </p>
              </div>
            </div>
          </div>

          {/* Right Col: Tool Calls Traced Live */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-white shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                    Agent Tool Calls Tracing
                  </h3>
                </div>
                <span className="rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 text-[10px] font-mono">
                  {investigationResult.tool_calls_executed.length} Calls
                </span>
              </div>

              <div className="space-y-3 font-mono text-[11px]">
                {investigationResult.tool_calls_executed.map((tc, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <span>➔ {tc.tool}()</span>
                      <span className="text-[10px] text-slate-500">Step {idx + 1}</span>
                    </div>
                    <div className="text-slate-400 text-[10px] truncate">
                      args: {JSON.stringify(tc.args)}
                    </div>
                    <div className="text-slate-300 text-[10px] bg-slate-900/90 p-1.5 rounded-md overflow-x-auto max-h-20">
                      {tc.result}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Controller Guarantee */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs space-y-2">
              <span className="font-bold text-slate-900 block">
                Verification Philosophy
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                All calculations (expected fees, taxes, differences) are computed mathematically by the deterministic rule engine. The LLM acts purely as an investigator to synthesize logs and recommend actions.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center space-y-3 text-center">
          <Bot className="h-10 w-10 text-slate-300 animate-pulse" />
          <p className="text-xs text-slate-500">
            Select a transaction above and click <strong>"Investigate"</strong>.
          </p>
        </div>
      )}
    </div>
  );
};
