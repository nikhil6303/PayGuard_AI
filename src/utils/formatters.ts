import { CurrencyCode, ReconciliationSeverity, ReconciliationStatus, ReviewStatus } from '../types';

export function formatCurrency(
  amount: number | null | undefined,
  currency: CurrencyCode = 'INR',
  compact: boolean = false
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '—';
  }

  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';

  if (compact) {
    if (currency === 'INR') {
      const abs = Math.abs(amount);
      if (abs >= 10000000) {
        return `${amount < 0 ? '-' : ''}${symbol}${(abs / 10000000).toFixed(2)}Cr`;
      }
      if (abs >= 100000) {
        return `${amount < 0 ? '-' : ''}${symbol}${(abs / 100000).toFixed(2)}L`;
      }
      if (abs >= 1000) {
        return `${amount < 0 ? '-' : ''}${symbol}${(abs / 1000).toFixed(1)}k`;
      }
    } else {
      const abs = Math.abs(amount);
      if (abs >= 1000000) {
        return `${amount < 0 ? '-' : ''}${symbol}${(abs / 1000000).toFixed(2)}M`;
      }
      if (abs >= 1000) {
        return `${amount < 0 ? '-' : ''}${symbol}${(abs / 1000).toFixed(1)}k`;
      }
    }
  }

  // Full currency display with comma separators
  if (currency === 'INR') {
    return `${symbol}${amount.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })}`;
  }

  return `${symbol}${amount.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
}

export function formatPercent(rate: number, decimals: number = 1): string {
  if (isNaN(rate)) return '0.0%';
  return `${rate.toFixed(decimals)}%`;
}

export function getStatusMeta(status: ReconciliationStatus): {
  label: string;
  badgeClass: string;
  dotClass: string;
  tier: 'MATCHED' | 'REVIEW' | 'EXCEPTION';
  humanDescription: string;
} {
  switch (status) {
    case 'MATCHED':
      return {
        label: '✓ Matches',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500',
        tier: 'MATCHED',
        humanDescription: 'Everything looks correct.',
      };
    case 'PARTIAL_MATCH':
      return {
        label: 'Partly Matches',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        dotClass: 'bg-amber-500',
        tier: 'REVIEW',
        humanDescription: 'Part of the payment amount matches.',
      };
    case 'AMOUNT_MISMATCH':
      return {
        label: "Amount Doesn't Match",
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500',
        tier: 'EXCEPTION',
        humanDescription: 'The amount charged does not match what reached the bank.',
      };
    case 'MISSING_PAYMENT':
      return {
        label: 'Payment Not Found',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        dotClass: 'bg-red-500',
        tier: 'EXCEPTION',
        humanDescription: 'Order was placed, but no payment was recorded.',
      };
    case 'MISSING_SETTLEMENT':
      return {
        label: 'Money Not Received',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        dotClass: 'bg-amber-500',
        tier: 'EXCEPTION',
        humanDescription: 'Payment was made, but money has not reached your bank yet.',
      };
    case 'DUPLICATE':
      return {
        label: 'Payment Appears Twice',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        dotClass: 'bg-purple-500',
        tier: 'EXCEPTION',
        humanDescription: 'The customer may have been charged more than once.',
      };
    case 'FEE_MISMATCH':
      return {
        label: "Fee Doesn't Match",
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        dotClass: 'bg-amber-500',
        tier: 'REVIEW',
        humanDescription: 'The gateway fee is different from what was agreed.',
      };
    case 'TAX_MISMATCH':
      return {
        label: "Tax Doesn't Match",
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        dotClass: 'bg-amber-500',
        tier: 'REVIEW',
        humanDescription: 'The calculated tax does not match.',
      };
    case 'BANK_UNCREDITED':
      return {
        label: 'Money Not in Bank',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500',
        tier: 'EXCEPTION',
        humanDescription: 'Deposit is missing from your bank account statement.',
      };
    default:
      return {
        label: 'Needs Attention',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
        tier: 'EXCEPTION',
        humanDescription: 'This payment needs to be checked.',
      };
  }
}

/**
 * Returns clean everyday English status badge:
 * - ✓ Matches
 * - ⚠ Needs Attention
 * - ⏳ Waiting
 * - ✕ Problem Found
 */
export function getSimplePaymentStatus(item: { status: ReconciliationStatus }): {
  label: string;
  badgeClass: string;
  explanation: string;
  type: 'MATCH' | 'ATTENTION' | 'WAITING' | 'PROBLEM';
} {
  if (item.status === 'MATCHED') {
    return {
      label: '✓ Matches',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      explanation: 'Everything looks correct.',
      type: 'MATCH',
    };
  }
  if (item.status === 'MISSING_SETTLEMENT' || item.status === 'BANK_UNCREDITED') {
    return {
      label: '⏳ Waiting',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      explanation: 'We are still waiting for the money.',
      type: 'WAITING',
    };
  }
  if (item.status === 'MISSING_PAYMENT' || item.status === 'DUPLICATE') {
    return {
      label: '✕ Problem Found',
      badgeClass: 'bg-red-50 text-red-700 border border-red-200',
      explanation: 'There is a clear problem with this payment.',
      type: 'PROBLEM',
    };
  }
  return {
    label: '⚠ Needs Attention',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    explanation: 'Something does not match.',
    type: 'ATTENTION',
  };
}

export function getSeverityMeta(severity: ReconciliationSeverity): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  switch (severity) {
    case 'CRITICAL':
      return {
        label: 'Critical',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
        dotClass: 'bg-rose-600',
      };
    case 'HIGH':
      return {
        label: 'High',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-300 font-medium',
        dotClass: 'bg-orange-500',
      };
    case 'MEDIUM':
      return {
        label: 'Medium',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        dotClass: 'bg-amber-500',
      };
    case 'LOW':
      return {
        label: 'Low',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
      };
    case 'NONE':
    default:
      return {
        label: 'None',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-400',
      };
  }
}

export function getReviewStatusMeta(status: ReviewStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'REVIEWED':
      return {
        label: 'Reviewed',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'ESCALATED':
      return {
        label: 'Escalated',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'IGNORED':
      return {
        label: 'Ignored',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      };
    case 'UNRESOLVED':
    default:
      return {
        label: 'Unresolved',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      };
  }
}

export function getCertaintyMeta(certainty: 'Confirmed' | 'Likely' | 'Possible' | 'Unable to determine'): {
  label: string;
  badgeClass: string;
} {
  switch (certainty) {
    case 'Confirmed':
      return {
        label: 'Confirmed',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
      };
    case 'Likely':
      return {
        label: 'Likely',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300 font-semibold',
      };
    case 'Possible':
      return {
        label: 'Possible',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
      };
    case 'Unable to determine':
    default:
      return {
        label: 'Unable to determine',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      };
  }
}

