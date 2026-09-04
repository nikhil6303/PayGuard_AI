export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface OrderRecord {
  order_id: string;
  customer_id: string;
  customer_name: string;
  order_amount: number;
  tax_amount: number;
  currency: CurrencyCode;
  order_date: string;
  product_category: string;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
}

export interface PaymentRecord {
  payment_id: string;
  order_id: string;
  payment_amount: number;
  payment_status: 'captured' | 'failed' | 'authorized' | 'refunded';
  payment_date: string;
  gateway: 'Razorpay' | 'Stripe' | 'PayU' | 'Cashfree' | 'HDFC_PG';
  payment_method: 'UPI' | 'Credit Card' | 'Debit Card' | 'NetBanking';
  auth_code: string;
}

export interface SettlementRecord {
  settlement_id: string;
  payment_id: string;
  settlement_amount: number;
  fee: number;
  tax_deducted: number;
  settlement_status: 'settled' | 'pending' | 'on_hold' | 'failed';
  settlement_date: string;
  settlement_ref: string;
}

export interface BankTransactionRecord {
  bank_tx_id: string;
  settlement_ref: string;
  bank_account: string;
  credit_amount: number;
  debit_amount: number;
  bank_date: string;
  description: string;
  balance: number;
}

export type ReconciliationStatus =
  | 'MATCHED'
  | 'PARTIAL_MATCH'
  | 'AMOUNT_MISMATCH'
  | 'MISSING_PAYMENT'
  | 'MISSING_SETTLEMENT'
  | 'DUPLICATE'
  | 'FEE_MISMATCH'
  | 'TAX_MISMATCH'
  | 'BANK_UNCREDITED'
  | 'UNKNOWN';

export type ReconciliationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export type ReviewStatus = 'UNRESOLVED' | 'REVIEWED' | 'ESCALATED' | 'IGNORED';

export interface EvidenceCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ReconciliationItem {
  id: string;
  transaction_id: string;
  order_id: string | null;
  payment_id: string | null;
  settlement_id: string | null;
  bank_tx_id: string | null;
  customer_name: string;
  date: string;
  order_amount: number | null;
  payment_amount: number | null;
  settlement_amount: number | null;
  bank_credit_amount: number | null;
  expected_settlement: number;
  fee: number;
  expected_fee: number;
  tax: number;
  expected_tax: number;
  difference: number;
  status: ReconciliationStatus;
  severity: ReconciliationSeverity;
  confidence: number; // 0 to 100
  review_status: ReviewStatus;
  evidence: EvidenceCheck[];
  likely_cause: string;
  recommended_action: string;
  gateway?: string;
  raw_order?: OrderRecord;
  raw_payment?: PaymentRecord;
  raw_settlement?: SettlementRecord;
  raw_bank_tx?: BankTransactionRecord;
}

export interface CashPositionData {
  available_cash: number;
  pending_payments: number;
  expected_settlements: number;
  outstanding_receivables: number;
  outstanding_payables: number;
  unreconciled_amount: number;
  net_cash_position: number;
  currency: CurrencyCode;
  history: Array<{
    date: string;
    cash: number;
    inflow: number;
    outflow: number;
    projected?: boolean;
  }>;
  forecast: {
    today: number;
    days_7: number;
    days_14: number;
    days_30: number;
    drivers: string[];
    risk_factor: 'Low' | 'Moderate' | 'Elevated';
  };
}

export interface ReconciliationSummary {
  total_orders: number;
  total_payments: number;
  total_settlements: number;
  total_bank_txs: number;
  total_records: number;
  total_transaction_value: number;
  matched_count: number;
  matched_value: number;
  review_count: number;
  review_value: number;
  exception_count: number;
  unreconciled_value: number;
  match_rate: number;
  processing_time_ms: number;
  throughput_rps: number;
  exceptions_by_type: Record<string, number>;
  exceptions_by_severity: Record<string, number>;
  ai_insights: string[];
  reconciled_at: string;
  cash_position: CashPositionData;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  transaction_id?: string;
  target_id?: string;
  actor: 'SYSTEM' | 'AI_AGENT' | 'CONTROLLER' | 'Reconciliation Engine' | 'PayGuard AI Agent' | 'Finance Controller' | 'System';
  result?: string;
  status?: string;
  type?: 'system' | 'reconciliation' | 'ai_agent' | 'user';
  details?: string;
}

export interface AIInvestigationResult {
  transaction_id: string;
  status: ReconciliationStatus;
  severity: ReconciliationSeverity;
  order_amount: number | null;
  payment_amount: number | null;
  settlement_amount: number | null;
  expected_settlement: number;
  difference: number;
  likely_cause: string;
  evidence: string[];
  recommended_action: string;
  certainty: 'Confirmed' | 'Likely' | 'Possible' | 'Unable to determine';
  tool_calls_executed: Array<{
    tool: string;
    args: Record<string, any>;
    result: string;
  }>;
  detailed_narrative: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'tool';
  text: string;
  timestamp: string;
  toolCall?: {
    name: string;
    args: any;
    result?: any;
  };
}
