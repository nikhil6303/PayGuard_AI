import React from 'react';
import {
  LayoutDashboard,
  RefreshCw,
  AlertTriangle,
  Wallet,
  Sparkles,
  FileText,
  History,
  Sliders,
  UploadCloud,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  exceptionCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  exceptionCount,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'upload',
      label: 'Upload Files',
      icon: UploadCloud,
      badge: null,
    },
    {
      id: 'reconciliation',
      label: 'Check Payments',
      icon: RefreshCw,
      badge: null,
    },
    {
      id: 'exceptions',
      label: 'Needs Attention',
      icon: AlertTriangle,
      badge: exceptionCount > 0 ? exceptionCount : null,
      badgeClass: 'bg-red-500/20 text-red-400 font-bold',
    },
    {
      id: 'cash-position',
      label: 'Money Overview',
      icon: Wallet,
      badge: null,
    },
    {
      id: 'ai-investigation',
      label: 'Find Problem with AI',
      icon: Sparkles,
      badge: null,
    },
  ];

  return (
    <aside className="w-60 bg-slate-900 flex flex-col border-r border-slate-800 shrink-0 h-screen sticky top-0 overflow-y-auto">
      {/* Brand Header */}
      <div className="p-6 flex items-center space-x-2.5">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/30">
          <span className="text-white font-bold text-lg leading-none">P</span>
        </div>
        <span className="text-white font-bold text-xl tracking-tight font-['Inter',sans-serif]">
          PayGuard AI
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1.5 mt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`flex w-full items-center justify-between p-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ml-auto ${
                    item.badgeClass || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

