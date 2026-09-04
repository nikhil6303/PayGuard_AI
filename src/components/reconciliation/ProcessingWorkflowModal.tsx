import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Cpu,
  ArrowRight,
  Database,
  Search,
  Scale,
  Percent,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';

interface ProcessingWorkflowModalProps {
  isOpen: boolean;
  onComplete: () => void;
  recordCount: number;
}

const WORKFLOW_STEPS = [
  { id: 1, label: 'Loading records', icon: Database, desc: 'Ingesting orders, payments, settlements & bank ledgers' },
  { id: 2, label: 'Normalizing transaction IDs', icon: Search, desc: 'Standardizing external reference IDs across gateways' },
  { id: 3, label: 'Matching Orders → Payments', icon: ArrowRight, desc: 'Verifying checkout-to-capture foreign keys' },
  { id: 4, label: 'Matching Payments → Settlements', icon: ArrowRight, desc: 'Aligning payout batches and settlement IDs' },
  { id: 5, label: 'Checking Bank Transactions', icon: Receipt, desc: 'Tracing nodal account bank UTR deposits' },
  { id: 6, label: 'Validating Amounts', icon: Scale, desc: 'Deterministic arithmetic check: Order vs Settlement' },
  { id: 7, label: 'Validating Fees', icon: Percent, desc: 'Checking contracted gateway MDR rates (2.0%)' },
  { id: 8, label: 'Validating Taxes', icon: FileSpreadsheet, desc: 'Auditing 18% GST deductions on processing fee' },
  { id: 9, label: 'Classifying Exceptions', icon: ShieldAlert, desc: 'Tagging severity: Missing, Mismatches & Duplicates' },
  { id: 10, label: 'Generating Report', icon: CheckCircle2, desc: 'Computing match rate and throughput analytics' },
];

export const ProcessingWorkflowModal: React.FC<ProcessingWorkflowModalProps> = ({
  isOpen,
  onComplete,
  recordCount,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      return;
    }

    setCurrentStepIndex(0);
    // Fast progression through 10 steps (approx 80ms each ~ 0.8s total)
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < WORKFLOW_STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            onComplete();
          }, 150);
          return prev;
        }
      });
    }, 85);

    return () => clearInterval(interval);
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  const currentStep = WORKFLOW_STEPS[currentStepIndex];
  const progressPercent = Math.round(((currentStepIndex + 1) / WORKFLOW_STEPS.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-100">
              <Cpu className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base font-['Plus_Jakarta_Sans']">
                Deterministic Reconciliation Engine
              </h3>
              <p className="text-xs text-slate-500">
                Processing batch of <strong className="text-slate-700">{recordCount} records</strong> across 4 sources
              </p>
            </div>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 font-mono">
            {progressPercent}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ ease: 'easeOut', duration: 0.3 }}
          />
        </div>

        {/* Live Step Progression Pipeline */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isFinished = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isPending = idx > currentStepIndex;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs transition-all ${
                  isCurrent
                    ? 'bg-indigo-50/80 border border-indigo-200 shadow-xs'
                    : isFinished
                    ? 'bg-slate-50 text-slate-700 border border-slate-100'
                    : 'text-slate-400 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      isFinished
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isFinished ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                  </div>
                  <div>
                    <p
                      className={`font-semibold ${
                        isCurrent ? 'text-indigo-900' : isFinished ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-[11px] text-indigo-600 font-normal">
                        {step.desc}
                      </p>
                    )}
                  </div>
                </div>

                {isCurrent && (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600 shrink-0" />
                )}
                {isFinished && (
                  <span className="text-[11px] font-medium text-emerald-600 shrink-0">
                    Done
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Guarantee & Instant Skip */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[11px] text-slate-500">
          <span>Checking all records...</span>
          <button
            onClick={onComplete}
            className="rounded px-2 py-0.5 font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            Skip to Results →
          </button>
        </div>
      </motion.div>
    </div>
  );
};
