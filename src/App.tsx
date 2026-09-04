import React, { useState, useEffect } from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ReconciliationView } from './components/reconciliation/ReconciliationView';
import { DataUploadView } from './components/upload/DataUploadView';
import { ExceptionsView } from './components/exceptions/ExceptionsView';
import { CashPositionView } from './components/cash/CashPositionView';
import { AIInvestigationView } from './components/investigation/AIInvestigationView';
import { ReportsView } from './components/reports/ReportsView';
import { HistoryView } from './components/history/HistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { ExceptionDetailDrawer } from './components/exceptions/ExceptionDetailDrawer';
import { ProcessingWorkflowModal } from './components/reconciliation/ProcessingWorkflowModal';
import { FinanceAgentChatDrawer } from './components/chat/FinanceAgentChatDrawer';
import {
  AuditLogEntry,
  CurrencyCode,
  ReconciliationItem,
  ReconciliationSummary,
  ReviewStatus,
  OrderRecord,
  PaymentRecord,
  SettlementRecord,
  BankTransactionRecord,
} from './types';
import { generateSyntheticDataset, runDeterministicReconciliation } from './engine/reconciliationEngine';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [selectedException, setSelectedException] = useState<ReconciliationItem | null>(null);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isRunningReconciliation, setIsRunningReconciliation] = useState<boolean>(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString(),
      action: 'SYSTEM_BOOT',
      actor: 'SYSTEM',
      target_id: 'CORE_ENGINE',
      details: 'PayGuard Autonomous Finance Engine v2.4 initialized with 4-way matching rules',
      status: 'SUCCESS',
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toLocaleTimeString(),
      action: 'DATASET_INGESTION',
      actor: 'SYSTEM',
      target_id: 'BATCH-2026-09-01',
      details: 'Ingested 115 orders, 110 payments, 105 settlements, and 100 bank clearing records',
      status: 'SUCCESS',
    },
  ]);

  const addAuditLog = (
    action: string,
    actor: 'SYSTEM' | 'AI_AGENT' | 'CONTROLLER',
    details: string,
    target_id?: string
  ) => {
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      action,
      actor,
      target_id,
      details,
      status: 'SUCCESS',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Initial load: boot deterministic engine locally & sync with backend
  useEffect(() => {
    const dataset = generateSyntheticDataset();
    const result = runDeterministicReconciliation(
      dataset.orders,
      dataset.payments,
      dataset.settlements,
      dataset.bankTransactions
    );
    setItems(result.items);
    setSummary(result.summary);

    // Try background sync with backend /api/reconcile
    fetch('/api/reconcile', { method: 'POST' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.items) {
          setItems(data.items);
          setSummary(data.summary);
        }
      })
      .catch(() => {
        // Fallback local engine already populated
      });
  }, []);

  // Run Reconciliation Trigger
  const handleRunReconciliation = () => {
    setIsRunningReconciliation(true);
    setIsWorkflowModalOpen(true);
  };

  const handleWorkflowComplete = async () => {
    setIsWorkflowModalOpen(false);
    setIsRunningReconciliation(false);

    try {
      const res = await fetch('/api/reconcile', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setSummary(data.summary);
      }
    } catch {
      // Refresh local engine
      const dataset = generateSyntheticDataset();
      const result = runDeterministicReconciliation(
        dataset.orders,
        dataset.payments,
        dataset.settlements,
        dataset.bankTransactions
      );
      setItems(result.items);
      setSummary(result.summary);
    }

    addAuditLog(
      'RUN_RECONCILIATION',
      'CONTROLLER',
      `Executed 10-stage deterministic reconciliation cycle across ${summary?.total_records || 115} records`,
      'BATCH-AUDIT'
    );
  };

  // Handle real uploaded dataset ingestion
  const handleIngestDataset = async (uploaded: {
    orders?: OrderRecord[];
    payments?: PaymentRecord[];
    settlements?: SettlementRecord[];
    bankTransactions?: BankTransactionRecord[];
  }) => {
    const base = generateSyntheticDataset();
    const isCustomUpload = Boolean(
      (uploaded.orders && uploaded.orders.length > 0) ||
      (uploaded.payments && uploaded.payments.length > 0) ||
      (uploaded.bankTransactions && uploaded.bankTransactions.length > 0) ||
      (uploaded.settlements && uploaded.settlements.length > 0)
    );

    const finalOrders = uploaded.orders && uploaded.orders.length > 0 ? uploaded.orders : (isCustomUpload ? [] : base.orders);
    const finalPayments = uploaded.payments && uploaded.payments.length > 0 ? uploaded.payments : (isCustomUpload ? [] : base.payments);
    const finalSettlements = uploaded.settlements && uploaded.settlements.length > 0 ? uploaded.settlements : (isCustomUpload ? [] : base.settlements);
    const finalBankTx = uploaded.bankTransactions && uploaded.bankTransactions.length > 0 ? uploaded.bankTransactions : (isCustomUpload ? [] : base.bankTransactions);

    const result = runDeterministicReconciliation(
      finalOrders,
      finalPayments,
      finalSettlements,
      finalBankTx
    );
    setItems(result.items);
    setSummary(result.summary);

    // Sync dataset to backend
    try {
      await fetch('/api/dataset/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: finalOrders,
          payments: finalPayments,
          settlements: finalSettlements,
          bankTransactions: finalBankTx,
        }),
      });
    } catch {
      console.warn('Dataset backend sync fallback');
    }

    addAuditLog(
      'DATASET_INGESTION',
      'CONTROLLER',
      `Ingested custom ledger files: ${finalOrders.length} orders, ${finalPayments.length} payments, ${finalSettlements.length} settlements, and ${finalBankTx.length} bank statements`,
      'CUSTOM-UPLOAD'
    );
  };

  // Update item review status
  const handleUpdateStatus = (id: string, newStatus: ReviewStatus) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, review_status: newStatus } : item))
    );

    if (selectedException && selectedException.id === id) {
      setSelectedException((prev) => (prev ? { ...prev, review_status: newStatus } : null));
    }

    const item = items.find((i) => i.id === id);
    addAuditLog(
      'STATUS_OVERRIDE',
      'CONTROLLER',
      `Manual status updated to ${newStatus} for ${item?.transaction_id || id}`,
      item?.transaction_id
    );
  };

  // Batch update
  const handleBatchUpdateStatus = (ids: string[], newStatus: ReviewStatus) => {
    setItems((prev) =>
      prev.map((item) => (ids.includes(item.id) ? { ...item, review_status: newStatus } : item))
    );
    addAuditLog(
      'BATCH_STATUS_UPDATE',
      'CONTROLLER',
      `Batch updated ${ids.length} exceptions to ${newStatus}`
    );
  };

  // Handle Ask AI from exception
  const handleAskAI = (item: ReconciliationItem) => {
    setSelectedException(item);
    setActiveTab('ai-investigation');
  };

  // Reset ledger data to baseline
  const handleResetData = () => {
    const dataset = generateSyntheticDataset();
    const result = runDeterministicReconciliation(
      dataset.orders,
      dataset.payments,
      dataset.settlements,
      dataset.bankTransactions
    );
    setItems(result.items);
    setSummary(result.summary);
    addAuditLog('RESET_LEDGER', 'CONTROLLER', 'Reset ledger data to baseline state');
  };

  const exceptionCount = summary ? summary.exception_count : 0;

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sleek Dark Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        exceptionCount={exceptionCount}
      />

      {/* Main Right Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <AppHeader
          summary={summary}
          isRunningReconciliation={isRunningReconciliation}
          onRunReconciliation={handleRunReconciliation}
          currency={currency}
          onToggleCurrency={() => setCurrency((prev) => (prev === 'INR' ? 'USD' : 'INR'))}
          isChatOpen={isChatOpen}
          onToggleChat={() => setIsChatOpen((prev) => !prev)}
          activeView={activeTab}
        />

        {/* Dynamic View Canvas */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              items={items}
              currency={currency}
              onSelectException={setSelectedException}
              onNavigateTab={setActiveTab}
              onRunReconciliation={handleRunReconciliation}
              onAskAI={handleAskAI}
            />
          )}

          {activeTab === 'reconciliation' && (
            <ReconciliationView
              summary={summary}
              items={items}
              currency={currency}
              isRunningReconciliation={isRunningReconciliation}
              onRunReconciliation={handleRunReconciliation}
              onSelectException={setSelectedException}
              onAskAI={handleAskAI}
              onUploadDataset={handleIngestDataset}
              onNavigateToUpload={() => setActiveTab('upload')}
            />
          )}

          {activeTab === 'upload' && (
            <DataUploadView
              currency={currency}
              onIngestDataset={handleIngestDataset}
              onNavigateToReconciliation={() => setActiveTab('reconciliation')}
            />
          )}

          {activeTab === 'exceptions' && (
            <ExceptionsView
              summary={summary}
              items={items}
              currency={currency}
              onSelectException={setSelectedException}
              onAskAI={handleAskAI}
              onBatchUpdateStatus={handleBatchUpdateStatus}
            />
          )}

          {activeTab === 'cash-position' && (
            <CashPositionView summary={summary} items={items} currency={currency} />
          )}

          {activeTab === 'ai-investigation' && (
            <AIInvestigationView
              items={items}
              currency={currency}
              selectedItem={selectedException}
              onSelectItem={setSelectedException}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView summary={summary} items={items} currency={currency} />
          )}

          {activeTab === 'history' && (
            <HistoryView
              logs={auditLogs}
              summary={summary}
              currency={currency}
              onRunReconciliation={handleRunReconciliation}
              onNavigateToExceptions={() => setActiveTab('exceptions')}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              currency={currency}
              onToggleCurrency={() => setCurrency((prev) => (prev === 'INR' ? 'USD' : 'INR'))}
              onResetData={handleResetData}
            />
          )}
        </main>
      </div>

      {/* Slide-over Exception Detail Drawer */}
      <ExceptionDetailDrawer
        item={selectedException}
        onClose={() => setSelectedException(null)}
        onUpdateStatus={handleUpdateStatus}
        onAskAI={handleAskAI}
        currency={currency}
      />

      {/* 10-Stage Animated Processing Workflow Modal */}
      <ProcessingWorkflowModal
        isOpen={isWorkflowModalOpen}
        onComplete={handleWorkflowComplete}
        recordCount={summary ? summary.total_records : 115}
      />

      {/* Global AI Assistant Chat Drawer */}
      <FinanceAgentChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        summary={summary}
        currency={currency}
      />
    </div>
  );
}


export default App;
