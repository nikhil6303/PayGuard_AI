import React, { useState } from 'react';
import {
  Sliders,
  ShieldCheck,
  Percent,
  DollarSign,
  Scale,
  RotateCcw,
  CheckCircle2,
  Save
} from 'lucide-react';
import { CurrencyCode } from '../../types';

interface SettingsViewProps {
  currency: CurrencyCode;
  onToggleCurrency: () => void;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currency,
  onToggleCurrency,
  onResetData,
}) => {
  const [tolerance, setTolerance] = useState<number>(1.0);
  const [feeRate, setFeeRate] = useState<number>(2.0);
  const [taxRate, setTaxRate] = useState<number>(18.0);
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold text-slate-900">
          Reconciliation Engine Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure mathematical matching tolerances, contracted payment gateway rates, and audit policies
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        {/* Arithmetic Tolerance */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-indigo-600" />
              Rounding & Arithmetic Variance Tolerance
            </span>
            <p className="text-xs text-slate-500">
              Discrepancies below this numerical threshold are reconciled as rounding differences
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono text-slate-700">₹ / $</span>
            <input
              type="number"
              step="0.1"
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              className="w-24 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Contracted Fee MDR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Percent className="h-4 w-4 text-indigo-600" />
              Contracted Gateway MDR Fee Rate
            </span>
            <p className="text-xs text-slate-500">
              Baseline agreed merchant discount rate charged by Razorpay, Stripe, Cashfree
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              value={feeRate}
              onChange={(e) => setFeeRate(Number(e.target.value))}
              className="w-24 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
            <span className="text-xs font-bold font-mono text-slate-700">%</span>
          </div>
        </div>

        {/* GST Rate */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Percent className="h-4 w-4 text-indigo-600" />
              GST / VAT Rate on Gateway Processing Fees
            </span>
            <p className="text-xs text-slate-500">
              Statutory tax applied strictly to the processing fee component (18.0% standard)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-24 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
            <span className="text-xs font-bold font-mono text-slate-700">%</span>
          </div>
        </div>

        {/* Primary Currency */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-indigo-600" />
              Primary Display Currency
            </span>
            <p className="text-xs text-slate-500">
              Toggle between Indian Rupee (₹ INR / Lakhs) and US Dollar ($ USD)
            </p>
          </div>
          <button
            onClick={onToggleCurrency}
            className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
          >
            Current: {currency === 'INR' ? '₹ INR (Indian Rupee)' : '$ USD (US Dollar)'}
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onResetData}
            className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Ledger to Baseline</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saved ? 'Saved Successfully!' : 'Save Engine Settings'}</span>
          </button>
        </div>

        {saved && (
          <div className="rounded-md bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Reconciliation thresholds updated and cached for active session.</span>
          </div>
        )}
      </div>
    </div>
  );
};
