import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles,
  Calendar,
  Receipt,
  CheckCircle2,
  Landmark,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { CurrencyCode, ReconciliationItem, ReconciliationSummary } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface CashPositionViewProps {
  summary: ReconciliationSummary | null;
  items?: ReconciliationItem[];
  currency: CurrencyCode;
}

export const CashPositionView: React.FC<CashPositionViewProps> = ({
  summary,
  items = [],
  currency,
}) => {
  const [forecastHorizon, setForecastHorizon] = useState<'7' | '14' | '30'>('7');

  if (!summary) return null;

  const cp = summary.cash_position;
  const forecast = cp.forecast;

  const currentProjectedValue =
    forecastHorizon === '7'
      ? forecast.days_7
      : forecastHorizon === '14'
      ? forecast.days_14
      : forecast.days_30;

  const projectedInflowDelta = currentProjectedValue - cp.available_cash;

  // Money to be received vs Money actually received calculations
  const totalToBeReceived =
    items.length > 0
      ? items.reduce((sum, item) => sum + (item.order_amount || 0), 0)
      : summary.total_transaction_value;

  const totalActuallyReceived =
    items.length > 0
      ? items.reduce(
          (sum, item) =>
            item.settlement_amount !== null && item.status !== 'BANK_UNCREDITED'
              ? sum + item.settlement_amount
              : sum,
          0
        )
      : summary.matched_value;

  const waitingToDeposit =
    items.length > 0
      ? items
          .filter(
            (item) => item.status === 'MISSING_SETTLEMENT' || item.status === 'BANK_UNCREDITED'
          )
          .reduce(
            (sum, item) => sum + (item.expected_settlement || item.order_amount || 0),
            0
          )
      : cp.expected_settlements;

  const discrepancies =
    items.length > 0
      ? items
          .filter(
            (item) =>
              item.difference > 0 &&
              item.status !== 'MISSING_SETTLEMENT' &&
              item.status !== 'BANK_UNCREDITED'
          )
          .reduce((sum, item) => sum + item.difference, 0)
      : cp.unreconciled_amount;

  const totalDifferenceGap = Math.max(0, totalToBeReceived - totalActuallyReceived);

  const receivedRate =
    totalToBeReceived > 0
      ? Math.min(100, Math.round((totalActuallyReceived / totalToBeReceived) * 100))
      : 0;

  const inTransitRate =
    totalToBeReceived > 0
      ? Math.min(100 - receivedRate, Math.round((waitingToDeposit / totalToBeReceived) * 100))
      : 0;

  const attentionRate = Math.max(0, 100 - receivedRate - inTransitRate);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Big Balance Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Current Cash Balance */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-6 text-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-indigo-300">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Money Available Now
                </span>
                <p className="text-[11px] text-slate-400">
                  Confirmed in your bank account
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
              Ready to Use
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-4 pt-2">
            <div className="text-4xl sm:text-5xl font-bold font-mono tracking-tight text-white">
              {formatCurrency(cp.available_cash, currency)}
            </div>
            <span className="text-xs text-slate-400">
              ({formatCurrency(cp.available_cash, currency, true)})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Money Coming to Bank</span>
              <strong className="text-white font-mono text-sm">
                +{formatCurrency(cp.expected_settlements, currency, true)}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Payments Waiting</span>
              <strong className="text-white font-mono text-sm">
                +{formatCurrency(cp.pending_payments, currency, true)}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Money to Pay Out</span>
              <strong className="text-red-400 font-mono text-sm">
                -{formatCurrency(cp.outstanding_payables, currency, true)}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Total Money Expected</span>
              <strong className="text-emerald-400 font-mono text-sm">
                {formatCurrency(cp.net_cash_position, currency, true)}
              </strong>
            </div>
          </div>
        </div>

        {/* Right: Forward Projected Target */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Upcoming Money
              </span>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                Expected
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Expected Money in {forecastHorizon} Days
            </h3>
          </div>

          <div className="space-y-1">
            <div className="text-3xl font-bold text-indigo-600 font-mono">
              {formatCurrency(currentProjectedValue, currency)}
            </div>
            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+{formatCurrency(projectedInflowDelta, currency)} estimated net inflow</span>
            </p>
          </div>

          {/* Horizon Selector */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {[
              { id: '7', label: '7 Days' },
              { id: '14', label: '14 Days' },
              { id: '30', label: '30 Days' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setForecastHorizon(tab.id as any)}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                  forecastHorizon === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Money to be Received vs Money Actually Received Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Landmark className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
                Money to be Received vs. Money Actually Received
              </h2>
              <p className="text-xs text-slate-500">
                Track how much customer money has been confirmed in the bank versus what is still pending.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>{receivedRate}% Received in Bank</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Money to be Received
              </span>
              <Receipt className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              {formatCurrency(totalToBeReceived, currency)}
            </div>
            <p className="text-[11px] text-slate-500">
              Total customer billing orders expected
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Money Actually Received
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 font-mono">
              {formatCurrency(totalActuallyReceived, currency)}
            </div>
            <p className="text-[11px] text-slate-500">
              Credited and verified in bank account
            </p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Difference (Still to Come)
              </span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-amber-700 font-mono">
              {formatCurrency(totalDifferenceGap, currency)}
            </div>
            <p className="text-[11px] text-slate-500">
              {formatCurrency(waitingToDeposit, currency)} in transit • {formatCurrency(discrepancies, currency)} to review
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-1">
          <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${receivedRate}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Received in bank: ${formatCurrency(totalActuallyReceived, currency)}`}
            />
            <div
              style={{ width: `${inTransitRate}%` }}
              className="bg-amber-400 transition-all duration-500"
              title={`Waiting to deposit: ${formatCurrency(waitingToDeposit, currency)}`}
            />
            <div
              style={{ width: `${attentionRate}%` }}
              className="bg-rose-500 transition-all duration-500"
              title={`Discrepancies: ${formatCurrency(discrepancies, currency)}`}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500">
            <span className="text-emerald-700 font-semibold">
              ● Received: {formatCurrency(totalActuallyReceived, currency)} ({receivedRate}%)
            </span>
            <span className="text-amber-700 font-semibold">
              ● Waiting to Deposit: {formatCurrency(waitingToDeposit, currency)} ({inTransitRate}%)
            </span>
            <span className="text-rose-700 font-semibold">
              ● Under Review: {formatCurrency(discrepancies, currency)} ({attentionRate}%)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Cash Flow Chart: Historical to Projected */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Cash Timeline & Flow Dynamics (Actual vs Projected)
            </h2>
            <p className="text-xs text-slate-500">
              Reconciled historical balance compared against forward multi-gateway settlement pipeline
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
              <span className="text-slate-600">Actual Ledger Balance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 border border-dashed border-indigo-600" />
              <span className="text-slate-600">Projected Pipeline</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cp.history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="actualFlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
              />
              <Tooltip
                formatter={(val: any, name: any, item: any) => [
                  formatCurrency(Number(val), currency),
                  item.payload.projected ? 'Projected Forecast' : 'Verified Balance',
                ]}
                labelFormatter={(label) => `Timeline: ${label}`}
                contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px', border: '1px solid #334155' }}
              />
              <Area
                type="monotone"
                dataKey="cash"
                stroke="#4F46E5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#actualFlow)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Component Breakdown & Forecast Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Components breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Cash Position Ledger Components
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Available Liquid Cash</span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(cp.available_cash, currency)}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Pending Gateway Settlements (T+2)</span>
              <span className="font-mono font-bold text-emerald-700">+{formatCurrency(cp.expected_settlements, currency)}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Outstanding Receivables</span>
              <span className="font-mono font-bold text-slate-900">+{formatCurrency(cp.outstanding_receivables, currency)}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Known Outgoing Payables (Vendors & MDR)</span>
              <span className="font-mono font-bold text-red-700">-{formatCurrency(cp.outstanding_payables, currency)}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 border border-red-100">
              <span className="font-semibold text-red-900">Unreconciled Variance Exposure</span>
              <span className="font-mono font-bold text-red-700">{formatCurrency(cp.unreconciled_amount, currency)}</span>
            </div>
          </div>
        </div>

        {/* Forecast Drivers & Honest Disclaimers */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Forecast Drivers & Risk Analysis
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
              Risk: {forecast.risk_factor}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {forecast.drivers.map((driver, idx) => (
              <div key={idx} className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                <span className="text-slate-700 leading-relaxed font-normal">{driver}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-amber-50/70 border border-amber-200 p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Disclaimer:</strong> Forward projections are estimates derived from historical settlement velocity and pending gateway batches. They are not guaranteed outcomes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
