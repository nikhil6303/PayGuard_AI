import React from 'react';
import {
  RotateCw,
  MessageSquare,
} from 'lucide-react';
import { CurrencyCode, ReconciliationSummary } from '../../types';

interface AppHeaderProps {
  summary: ReconciliationSummary | null;
  isRunningReconciliation: boolean;
  onRunReconciliation: () => void;
  currency: CurrencyCode;
  onToggleCurrency: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  activeView: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  summary: _summary,
  isRunningReconciliation,
  onRunReconciliation,
  currency,
  onToggleCurrency,
  isChatOpen,
  onToggleChat,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 lg:px-8 flex items-center justify-between shrink-0 sticky top-0 z-20">
      {/* Left Data Status Bar */}
      <div className="flex items-center space-x-3 text-xs sm:text-sm">
        <span className="text-slate-700 font-semibold">PayGuard AI</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500 text-xs">
          Checking payments automatically
        </span>
      </div>

      {/* Right Controls & Actions */}
      <div className="flex items-center space-x-3">
        {/* Currency Toggle */}
        <button
          onClick={onToggleCurrency}
          title="Toggle Currency"
          className="border border-slate-200 bg-white text-slate-700 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-slate-50 transition-colors"
        >
          {currency === 'INR' ? '₹ INR' : '$ USD'}
        </button>

        {/* Chat Drawer Toggle */}
        <button
          id="btn-toggle-chat"
          onClick={onToggleChat}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            isChatOpen
              ? 'bg-slate-900 text-white shadow-xs'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="hidden md:inline">AI Finance Assistant</span>
        </button>
      </div>
    </header>
  );
};

