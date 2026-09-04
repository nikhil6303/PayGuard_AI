import {
  OrderRecord,
  PaymentRecord,
  SettlementRecord,
  BankTransactionRecord,
  CurrencyCode,
} from '../types';

export interface ParsedDatasetResult {
  orders?: OrderRecord[];
  payments?: PaymentRecord[];
  settlements?: SettlementRecord[];
  bankTransactions?: BankTransactionRecord[];
  errors: string[];
  warnings: string[];
  summaryMessage: string;
}

// Helper to parse CSV lines safely considering quotes
export function parseCSVText(csvContent: string): { headers: string[]; rows: string[][] } {
  const lines = csvContent
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === '\t' || char === ';') && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
  const rows = lines.slice(1).map((line) => parseLine(line).map((col) => col.replace(/^["']|["']$/g, '').trim()));

  return { headers, rows };
}

// Find column index by checking various common aliases
function findColumnIndex(headers: string[], aliases: string[]): number {
  // First pass: exact clean match
  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idx = headers.findIndex((h) => {
      const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanH === target;
    });
    if (idx !== -1) return idx;
  }
  // Second pass: substring match for aliases longer than 2 chars
  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (target.length < 3) continue;
    const idx = headers.findIndex((h) => {
      const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanH.includes(target);
    });
    if (idx !== -1) return idx;
  }
  return -1;
}

// Parse Order Records CSV
export function parseOrdersCSV(csvText: string, defaultCurrency: CurrencyCode = 'INR'): { records: OrderRecord[]; errors: string[] } {
  const { headers, rows } = parseCSVText(csvText);
  const errors: string[] = [];
  const records: OrderRecord[] = [];

  const idIdx = findColumnIndex(headers, ['order_id', 'orderid', 'order id', 'order_no', 'orderno', 'order_number', 'invoice_id', 'id']);
  const amountIdx = findColumnIndex(headers, ['order_amount', 'order amount', 'amount', 'total', 'grand_total', 'order_value', 'value', 'price', 'net']);
  const customerIdx = findColumnIndex(headers, ['customer_name', 'customer name', 'customer', 'client', 'buyer', 'name', 'user']);
  const dateIdx = findColumnIndex(headers, ['order_date', 'order date', 'date', 'created_at', 'timestamp', 'order_time']);
  const statusIdx = findColumnIndex(headers, ['status', 'order_status', 'state']);
  const categoryIdx = findColumnIndex(headers, ['product_category', 'category', 'item_type', 'type']);
  const taxIdx = findColumnIndex(headers, ['tax_amount', 'tax', 'gst', 'vat']);

  if (amountIdx === -1 && idIdx === -1) {
    errors.push('Could not detect order amount or ID column in CSV header.');
    return { records, errors };
  }

  rows.forEach((row, i) => {
    if (row.length === 0 || row.every((c) => !c)) return;

    const rawId = idIdx !== -1 && row[idIdx] ? row[idIdx] : `ORD-${10000 + i + 1}`;
    const rawAmountStr = amountIdx !== -1 && row[amountIdx] ? row[amountIdx].replace(/[₹$,\s]/g, '') : '0';
    const amount = parseFloat(rawAmountStr) || 0;
    const customer = customerIdx !== -1 && row[customerIdx] ? row[customerIdx] : `Customer ${i + 1}`;
    const date = dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : new Date().toISOString().split('T')[0];
    const statusRaw = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].toLowerCase() : 'completed';
    const category = categoryIdx !== -1 && row[categoryIdx] ? row[categoryIdx] : 'Enterprise Services';
    const tax = taxIdx !== -1 && row[taxIdx] ? parseFloat(row[taxIdx].replace(/[₹$,\s]/g, '')) || 0 : Number((amount * 0.18).toFixed(2));

    records.push({
      order_id: rawId.trim(),
      customer_id: `CUST-${100 + i}`,
      customer_name: customer,
      order_amount: Number(amount.toFixed(2)),
      tax_amount: Number(tax.toFixed(2)),
      currency: defaultCurrency,
      order_date: date,
      product_category: category,
      status: (statusRaw.includes('canc') ? 'cancelled' : statusRaw.includes('pend') ? 'pending' : statusRaw.includes('ref') ? 'refunded' : 'completed') as any,
    });
  });

  return { records, errors };
}

// Parse Payments CSV
export function parsePaymentsCSV(csvText: string): { records: PaymentRecord[]; errors: string[] } {
  const { headers, rows } = parseCSVText(csvText);
  const errors: string[] = [];
  const records: PaymentRecord[] = [];

  const orderIdIdx = findColumnIndex(headers, ['order_id', 'orderid', 'order id', 'order_no', 'orderno', 'order_number', 'order_ref', 'invoice_id', 'invoice', 'reference', 'ref']);
  const payIdIdx = findColumnIndex(headers, ['payment_id', 'paymentid', 'payment id', 'pay_id', 'payid', 'transaction_id', 'txn_id', 'tx_id', 'gateway_id']);
  const amountIdx = findColumnIndex(headers, ['payment_amount', 'payment amount', 'amount', 'paid_amount', 'gross_amount', 'total', 'captured_amount', 'value']);
  const gatewayIdx = findColumnIndex(headers, ['gateway', 'provider', 'payment_gateway', 'channel']);
  const methodIdx = findColumnIndex(headers, ['payment_method', 'method', 'mode', 'type']);
  const statusIdx = findColumnIndex(headers, ['payment_status', 'status', 'state']);
  const dateIdx = findColumnIndex(headers, ['payment_date', 'date', 'paid_at', 'captured_at', 'timestamp']);

  rows.forEach((row, i) => {
    if (row.length === 0 || row.every((c) => !c)) return;

    const payId = payIdIdx !== -1 && row[payIdIdx] ? row[payIdIdx] : `pay_${10000 + i + 1}`;
    const orderId = orderIdIdx !== -1 && row[orderIdIdx] ? row[orderIdIdx] : `ORD-${10000 + i + 1}`;
    const amountStr = amountIdx !== -1 && row[amountIdx] ? row[amountIdx].replace(/[₹$,\s]/g, '') : '0';
    const amount = parseFloat(amountStr) || 0;
    const gatewayRaw = gatewayIdx !== -1 && row[gatewayIdx] ? row[gatewayIdx] : 'Razorpay';
    const methodRaw = methodIdx !== -1 && row[methodIdx] ? row[methodIdx] : 'UPI';
    const statusRaw = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].toLowerCase() : 'captured';
    const date = dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : new Date().toISOString().split('T')[0];

    const gatewayClean: any = gatewayRaw.includes('Stripe') ? 'Stripe' : gatewayRaw.includes('PayU') ? 'PayU' : gatewayRaw.includes('Cashfree') ? 'Cashfree' : gatewayRaw.includes('HDFC') ? 'HDFC_PG' : 'Razorpay';
    const methodClean: any = methodRaw.includes('Credit') ? 'Credit Card' : methodRaw.includes('Debit') ? 'Debit Card' : methodRaw.includes('Net') ? 'NetBanking' : 'UPI';

    records.push({
      payment_id: payId.trim(),
      order_id: orderId.trim(),
      payment_amount: Number(amount.toFixed(2)),
      payment_status: statusRaw.includes('fail') ? 'failed' : statusRaw.includes('auth') ? 'authorized' : statusRaw.includes('ref') ? 'refunded' : 'captured',
      payment_date: date,
      gateway: gatewayClean,
      payment_method: methodClean,
      auth_code: `AUTH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    });
  });

  return { records, errors };
}

// Parse Settlements CSV
export function parseSettlementsCSV(csvText: string): { records: SettlementRecord[]; errors: string[] } {
  const { headers, rows } = parseCSVText(csvText);
  const errors: string[] = [];
  const records: SettlementRecord[] = [];

  const setlIdIdx = findColumnIndex(headers, ['settlement_id', 'payout_id', 'batch_id', 'settlement_number', 'id']);
  const payIdIdx = findColumnIndex(headers, ['payment_id', 'paymentid', 'txn_id', 'ref_payment_id']);
  const amountIdx = findColumnIndex(headers, ['amount_received', 'settlement_amount', 'net_amount', 'payout_amount', 'settled_amount', 'net', 'amount']);
  const feeIdx = findColumnIndex(headers, ['fee', 'mdr', 'gateway_fee', 'commission', 'charges']);
  const taxIdx = findColumnIndex(headers, ['tax_deducted', 'tax', 'gst', 'vat_deducted']);
  const refIdx = findColumnIndex(headers, ['settlement_ref', 'utr', 'bank_ref', 'batch_ref', 'reference']);
  const dateIdx = findColumnIndex(headers, ['settlement_date', 'date', 'payout_date', 'settled_at']);

  rows.forEach((row, i) => {
    if (row.length === 0 || row.every((c) => !c)) return;

    const setlId = setlIdIdx !== -1 && row[setlIdIdx] ? row[setlIdIdx] : `setl_${20000 + i + 1}`;
    const payId = payIdIdx !== -1 && row[payIdIdx] ? row[payIdIdx] : `pay_${10000 + i + 1}`;
    const amountStr = amountIdx !== -1 ? row[amountIdx].replace(/[₹$,\s]/g, '') : '0';
    const amount = parseFloat(amountStr) || 0;
    const feeStr = feeIdx !== -1 ? row[feeIdx].replace(/[₹$,\s]/g, '') : '0';
    const fee = parseFloat(feeStr) || Number((amount * 0.02).toFixed(2));
    const taxStr = taxIdx !== -1 ? row[taxIdx].replace(/[₹$,\s]/g, '') : '0';
    const tax = parseFloat(taxStr) || 0;
    const ref = refIdx !== -1 && row[refIdx] ? row[refIdx] : `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const date = dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : new Date().toISOString().split('T')[0];

    records.push({
      settlement_id: setlId.trim(),
      payment_id: payId.trim(),
      settlement_amount: Number(amount.toFixed(2)),
      fee: Number(fee.toFixed(2)),
      tax_deducted: Number(tax.toFixed(2)),
      settlement_status: 'settled',
      settlement_date: date,
      settlement_ref: ref.trim(),
    });
  });

  return { records, errors };
}

// Parse Bank Statement CSV / Statements
export function parseBankStatementCSV(csvText: string): { records: BankTransactionRecord[]; errors: string[] } {
  const { headers, rows } = parseCSVText(csvText);
  const errors: string[] = [];
  const records: BankTransactionRecord[] = [];

  const txIdIdx = findColumnIndex(headers, ['bank_tx_id', 'tx_id', 'transaction_id', 'ref_no', 'cheque_no', 'id']);
  const refIdx = findColumnIndex(headers, ['settlement_ref', 'utr', 'narration', 'description', 'reference', 'remarks']);
  const creditIdx = findColumnIndex(headers, ['credit_amount', 'credit', 'deposit', 'cr_amount', 'inward', 'amount_received', 'amount']);
  const debitIdx = findColumnIndex(headers, ['debit_amount', 'debit', 'withdrawal', 'dr_amount', 'outward']);
  const balanceIdx = findColumnIndex(headers, ['balance', 'closing_balance', 'available_balance']);
  const dateIdx = findColumnIndex(headers, ['bank_date', 'date', 'value_date', 'tx_date', 'posted_date']);
  const descIdx = findColumnIndex(headers, ['description', 'particulars', 'narration', 'details']);
  const accountIdx = findColumnIndex(headers, ['bank_account', 'account_no', 'account', 'nodal_account']);

  rows.forEach((row, i) => {
    if (row.length === 0 || row.every((c) => !c)) return;

    const txId = txIdIdx !== -1 && row[txIdIdx] ? row[txIdIdx] : `BNK-${30000 + i + 1}`;
    const desc = descIdx !== -1 && row[descIdx] ? row[descIdx] : row[refIdx] || 'Payout Nodal Transfer';
    
    // Extract UTR from narration if available
    let ref = refIdx !== -1 && row[refIdx] ? row[refIdx] : '';
    if (!ref.startsWith('UTR')) {
      const utrMatch = desc.match(/UTR\w+/i) || desc.match(/\b\d{12}\b/);
      if (utrMatch) ref = utrMatch[0];
      else ref = `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    }

    const creditStr = creditIdx !== -1 ? row[creditIdx].replace(/[₹$,\s]/g, '') : '0';
    const credit = parseFloat(creditStr) || 0;
    const debitStr = debitIdx !== -1 ? row[debitIdx].replace(/[₹$,\s]/g, '') : '0';
    const debit = parseFloat(debitStr) || 0;
    const balanceStr = balanceIdx !== -1 ? row[balanceIdx].replace(/[₹$,\s]/g, '') : '1850000';
    const balance = parseFloat(balanceStr) || 1850000;
    const date = dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : new Date().toISOString().split('T')[0];
    const account = accountIdx !== -1 && row[accountIdx] ? row[accountIdx] : 'HDFC-NODAL-0982';

    records.push({
      bank_tx_id: txId.trim(),
      settlement_ref: ref.trim(),
      bank_account: account,
      credit_amount: Number(credit.toFixed(2)),
      debit_amount: Number(debit.toFixed(2)),
      bank_date: date,
      description: desc,
      balance: Number(balance.toFixed(2)),
    });
  });

  return { records, errors };
}

// Download Sample CSV Helper
export function downloadCSVTemplate(type: 'orders' | 'payments' | 'settlements' | 'bank_statement') {
  let headers = '';
  let sampleRows = '';
  let filename = `${type}_template.csv`;

  if (type === 'orders') {
    headers = 'order_id,customer_name,order_amount,tax_amount,order_date,product_category,status';
    sampleRows = `ORD-9001,Acme Global Corp,45000,8100,2026-09-01,Enterprise SaaS,completed
ORD-9002,Zephyr Tech Labs,28500,5130,2026-09-01,Cloud Hosting,completed
ORD-9003,Starlight Media,15000,2700,2026-09-02,Digital Ads,completed
ORD-9004,Nexus Logistics,62000,11160,2026-09-02,Supply Chain,completed`;
  } else if (type === 'payments') {
    headers = 'payment_id,order_id,payment_amount,gateway,payment_method,payment_date,payment_status';
    sampleRows = `pay_9001,ORD-9001,45000,Razorpay,UPI,2026-09-01,captured
pay_9002,ORD-9002,28500,Stripe,Credit Card,2026-09-01,captured
pay_9003,ORD-9003,15000,Cashfree,NetBanking,2026-09-02,captured
pay_9004,ORD-9004,62000,Razorpay,UPI,2026-09-02,captured`;
  } else if (type === 'settlements') {
    headers = 'settlement_id,payment_id,settlement_amount,fee,tax_deducted,settlement_ref,settlement_date';
    sampleRows = `setl_9001,pay_9001,43938,900,162,UTR894819201948,2026-09-03
setl_9002,pay_9002,27827,570,103,UTR894819201949,2026-09-03
setl_9003,pay_9003,14646,300,54,UTR894819201950,2026-09-04
setl_9004,pay_9004,60537,1240,223,UTR894819201951,2026-09-04`;
  } else if (type === 'bank_statement') {
    headers = 'bank_tx_id,bank_date,description,settlement_ref,credit_amount,debit_amount,balance,bank_account';
    sampleRows = `BNK-9001,2026-09-03,PG_PAYOUT_NODAL UTR894819201948,UTR894819201948,43938,0,1885938,HDFC-NODAL-0982
BNK-9002,2026-09-03,STRIPE_TRANSFER UTR894819201949,UTR894819201949,27827,0,1913765,HDFC-NODAL-0982
BNK-9003,2026-09-04,CASHFREE_SETL UTR894819201950,UTR894819201950,14646,0,1928411,HDFC-NODAL-0982
BNK-9004,2026-09-04,RAZORPAY_BATCH UTR894819201951,UTR894819201951,60537,0,1988948,HDFC-NODAL-0982`;
  }

  const csvContent = `${headers}\n${sampleRows}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
