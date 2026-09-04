import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Building,
  CreditCard,
  Receipt,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  Download,
  Trash2,
  Play,
  ArrowRight,
  Sparkles,
  Info,
  RefreshCw
} from 'lucide-react';
import {
  OrderRecord,
  PaymentRecord,
  SettlementRecord,
  BankTransactionRecord,
  CurrencyCode,
} from '../../types';
import {
  parseOrdersCSV,
  parsePaymentsCSV,
  parseSettlementsCSV,
  parseBankStatementCSV,
  downloadCSVTemplate,
} from '../../utils/fileParser';
import { formatCurrency } from '../../utils/formatters';

interface DataUploadViewProps {
  currency: CurrencyCode;
  onIngestDataset: (dataset: {
    orders?: OrderRecord[];
    payments?: PaymentRecord[];
    settlements?: SettlementRecord[];
    bankTransactions?: BankTransactionRecord[];
  }) => void;
  onNavigateToReconciliation: () => void;
}

export const DataUploadView: React.FC<DataUploadViewProps> = ({
  currency,
  onIngestDataset,
  onNavigateToReconciliation,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<{
    orders?: { name: string; size: string; records: OrderRecord[] };
    payments?: { name: string; size: string; records: PaymentRecord[] };
    settlements?: { name: string; size: string; records: SettlementRecord[] };
    bankTransactions?: { name: string; size: string; records: BankTransactionRecord[] };
  }>({});

  const [activePreview, setActivePreview] = useState<'orders' | 'payments' | 'bankTransactions'>('orders');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Read file as text
  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleFileDrop = async (
    type: 'orders' | 'payments' | 'bankTransactions',
    file: File
  ) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const text = await readFile(file);
      const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;

      if (type === 'orders') {
        const { records, errors } = parseOrdersCSV(text, currency);
        if (records.length === 0) {
          setErrorMessage(errors[0] || 'No valid order rows found in uploaded file.');
          return;
        }
        setUploadedFiles((prev) => ({
          ...prev,
          orders: { name: file.name, size: sizeStr, records },
        }));
        setActivePreview('orders');
        setSuccessMessage(`Parsed ${records.length} orders from ${file.name}`);
      } else if (type === 'payments') {
        const { records, errors } = parsePaymentsCSV(text);
        if (records.length === 0) {
          setErrorMessage(errors[0] || 'No valid payment rows found in uploaded file.');
          return;
        }
        setUploadedFiles((prev) => ({
          ...prev,
          payments: { name: file.name, size: sizeStr, records },
        }));
        setActivePreview('payments');
        setSuccessMessage(`Parsed ${records.length} payments from ${file.name}`);
      } else if (type === 'bankTransactions') {
        const { records: bankRecs, errors: bankErrors } = parseBankStatementCSV(text);
        const { records: setlRecs } = parseSettlementsCSV(text);

        if (setlRecs.length > 0 && bankRecs.length > 0) {
          setUploadedFiles((prev) => ({
            ...prev,
            settlements: { name: file.name, size: sizeStr, records: setlRecs },
            bankTransactions: { name: file.name, size: sizeStr, records: bankRecs },
          }));
          setActivePreview('bankTransactions');
          setSuccessMessage(`Parsed ${setlRecs.length} settlements and ${bankRecs.length} records from ${file.name}`);
        } else if (bankRecs.length > 0) {
          setUploadedFiles((prev) => ({
            ...prev,
            bankTransactions: { name: file.name, size: sizeStr, records: bankRecs },
          }));
          setActivePreview('bankTransactions');
          setSuccessMessage(`Parsed ${bankRecs.length} bank transactions from ${file.name}`);
        } else {
          setErrorMessage(bankErrors[0] || 'No valid bank statement entries found.');
        }
      }
    } catch (err: any) {
      setErrorMessage(`Failed to parse file: ${err.message}`);
    }
  };

  const handleClearFile = (type: 'orders' | 'payments' | 'bankTransactions') => {
    setUploadedFiles((prev) => {
      const copy = { ...prev };
      delete copy[type];
      return copy;
    });
  };

  const handleIngestAll = () => {
    const hasAny =
      uploadedFiles.orders ||
      uploadedFiles.payments ||
      uploadedFiles.bankTransactions;

    if (!hasAny) {
      setErrorMessage('Please upload at least one file (Orders, Payments, or Bank Statements).');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      onIngestDataset({
        orders: uploadedFiles.orders?.records,
        payments: uploadedFiles.payments?.records,
        settlements: uploadedFiles.settlements?.records,
        bankTransactions: uploadedFiles.bankTransactions?.records,
      });
      setIsProcessing(false);
      onNavigateToReconciliation();
    }, 400);
  };

  const totalUploadedRows =
    (uploadedFiles.orders?.records.length || 0) +
    (uploadedFiles.payments?.records.length || 0) +
    (uploadedFiles.bankTransactions?.records.length || 0);

  return (
    <div className="space-y-6 pb-12 max-w-6xl">
      {/* Simple Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              Upload Data
            </h1>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              CSV / TSV / JSON
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Upload your orders, payments, and bank statements to check your records.
          </p>
        </div>

        {totalUploadedRows > 0 && (
          <button
            onClick={handleIngestAll}
            disabled={isProcessing}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-white" />
            )}
            <span>Check ({totalUploadedRows} records)</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 3 Upload Sections: Orders, Payments, Bank Statements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Orders */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Building className="h-4 w-4 text-indigo-600" />
                1. Orders
              </span>
              <button
                onClick={() => downloadCSVTemplate('orders')}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5"
                title="Download sample CSV template"
              >
                <Download className="h-3 w-3" />
                <span>Template</span>
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Upload customer order records
            </p>
          </div>

          {uploadedFiles.orders ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="truncate font-semibold text-emerald-900">
                  {uploadedFiles.orders.name}
                </div>
                <button
                  onClick={() => handleClearFile('orders')}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-[11px] text-emerald-700 font-mono">
                {uploadedFiles.orders.records.length} orders ({uploadedFiles.orders.size})
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/60 p-5 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all">
              <UploadCloud className="h-6 w-6 text-indigo-500" />
              <div>
                <span className="text-xs font-semibold text-indigo-600">Click to upload</span>
                <p className="text-[10px] text-slate-400 mt-0.5">CSV, TSV, JSON (up to 10MB)</p>
              </div>
              <input
                type="file"
                accept=".csv,.tsv,.txt,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileDrop('orders', file);
                }}
              />
            </label>
          )}
        </div>

        {/* 2. Payments */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                2. Payments
              </span>
              <button
                onClick={() => downloadCSVTemplate('payments')}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5"
                title="Download sample CSV template"
              >
                <Download className="h-3 w-3" />
                <span>Template</span>
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Upload payment gateway records
            </p>
          </div>

          {uploadedFiles.payments ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="truncate font-semibold text-emerald-900">
                  {uploadedFiles.payments.name}
                </div>
                <button
                  onClick={() => handleClearFile('payments')}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-[11px] text-emerald-700 font-mono">
                {uploadedFiles.payments.records.length} payments ({uploadedFiles.payments.size})
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/60 p-5 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/20 transition-all">
              <UploadCloud className="h-6 w-6 text-emerald-500" />
              <div>
                <span className="text-xs font-semibold text-emerald-600">Click to upload</span>
                <p className="text-[10px] text-slate-400 mt-0.5">CSV, TSV, JSON (up to 10MB)</p>
              </div>
              <input
                type="file"
                accept=".csv,.tsv,.txt,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileDrop('payments', file);
                }}
              />
            </label>
          )}
        </div>

        {/* 3. Bank Statements */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileCheck2 className="h-4 w-4 text-blue-600" />
                3. Bank Statements
              </span>
              <button
                onClick={() => downloadCSVTemplate('bank_statement')}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5"
                title="Download sample CSV template"
              >
                <Download className="h-3 w-3" />
                <span>Template</span>
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Upload bank statement files
            </p>
          </div>

          {uploadedFiles.bankTransactions ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="truncate font-semibold text-emerald-900">
                  {uploadedFiles.bankTransactions.name}
                </div>
                <button
                  onClick={() => handleClearFile('bankTransactions')}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-[11px] text-emerald-700 font-mono">
                {uploadedFiles.bankTransactions.records.length} credits ({uploadedFiles.bankTransactions.size})
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/60 p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-all">
              <UploadCloud className="h-6 w-6 text-blue-500" />
              <div>
                <span className="text-xs font-semibold text-blue-600">Click to upload</span>
                <p className="text-[10px] text-slate-400 mt-0.5">CSV, TXT (up to 10MB)</p>
              </div>
              <input
                type="file"
                accept=".csv,.tsv,.txt,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileDrop('bankTransactions', file);
                }}
              />
            </label>
          )}
        </div>
      </div>

      {/* Simple Data Preview Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Data Preview
            </h2>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
            {[
              { id: 'orders', label: 'Orders' },
              { id: 'payments', label: 'Payments' },
              { id: 'bankTransactions', label: 'Bank Statements' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePreview(tab.id as 'orders' | 'payments' | 'bankTransactions')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  activePreview === tab.id
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label} (
                {uploadedFiles[tab.id as keyof typeof uploadedFiles]?.records.length || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {activePreview === 'orders' && (
          <div className="overflow-x-auto">
            {uploadedFiles.orders?.records.length ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Order Amount</th>
                    <th className="py-2.5 px-3 text-right">Tax (18%)</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {uploadedFiles.orders.records.slice(0, 8).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">{r.order_id}</td>
                      <td className="py-2 px-3 font-sans text-slate-700">{r.customer_name}</td>
                      <td className="py-2 px-3 font-sans text-slate-500">{r.product_category}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(r.order_amount, currency)}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{formatCurrency(r.tax_amount, currency)}</td>
                      <td className="py-2 px-3 text-slate-500">{r.order_date}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">
                No orders uploaded yet. Upload a CSV file above.
              </div>
            )}
          </div>
        )}

        {activePreview === 'payments' && (
          <div className="overflow-x-auto">
            {uploadedFiles.payments?.records.length ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Payment ID</th>
                    <th className="py-2.5 px-3">Order Ref</th>
                    <th className="py-2.5 px-3">Gateway</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Captured Amount</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {uploadedFiles.payments.records.slice(0, 8).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">{r.payment_id}</td>
                      <td className="py-2 px-3 text-indigo-600">{r.order_id}</td>
                      <td className="py-2 px-3 font-sans text-slate-700">{r.gateway}</td>
                      <td className="py-2 px-3 font-sans text-slate-500">{r.payment_method}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(r.payment_amount, currency)}</td>
                      <td className="py-2 px-3 text-slate-500">{r.payment_date}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {r.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">
                No payments uploaded yet. Upload a CSV file above.
              </div>
            )}
          </div>
        )}

        {activePreview === 'bankTransactions' && (
          <div className="overflow-x-auto">
            {uploadedFiles.bankTransactions?.records.length ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Bank Tx ID</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Credit Amount</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {uploadedFiles.bankTransactions.records.slice(0, 8).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">{r.bank_tx_id}</td>
                      <td className="py-2 px-3 text-slate-600">{r.bank_account}</td>
                      <td className="py-2 px-3 font-sans text-slate-800 truncate max-w-xs">{r.description}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatCurrency(r.credit_amount, currency)}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{formatCurrency(r.balance, currency)}</td>
                      <td className="py-2 px-3 text-slate-500">{r.bank_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">
                No bank statements uploaded yet. Upload a statement file above.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Button */}
      {totalUploadedRows > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-indigo-950">
              Ready to Check Records
            </h3>
            <p className="text-xs text-indigo-800">
              {totalUploadedRows} records ready across uploaded files.
            </p>
          </div>

          <button
            onClick={handleIngestAll}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-white" />
            )}
            <span>Check</span>
          </button>
        </div>
      )}
    </div>
  );
};
