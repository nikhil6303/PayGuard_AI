import fs from 'fs';
import path from 'path';
import { parseOrdersCSV, parsePaymentsCSV, parseSettlementsCSV } from '../src/utils/fileParser';
import { runDeterministicReconciliation } from '../src/engine/reconciliationEngine';

const dataDir = path.join(process.cwd(), 'data_for_training');

const ordersCSV = fs.readFileSync(path.join(dataDir, 'orders.csv'), 'utf-8');
const paymentsCSV = fs.readFileSync(path.join(dataDir, 'payments.csv'), 'utf-8');
const settlementsCSV = fs.readFileSync(path.join(dataDir, 'settlements.csv'), 'utf-8');
const groundTruthCSV = fs.readFileSync(path.join(dataDir, 'ground_truth.csv'), 'utf-8');

const { records: orders } = parseOrdersCSV(ordersCSV);
const { records: payments } = parsePaymentsCSV(paymentsCSV);
const { records: settlements } = parseSettlementsCSV(settlementsCSV);

console.log(`Parsed ${orders.length} orders, ${payments.length} payments, ${settlements.length} settlements.`);

const { items, summary } = runDeterministicReconciliation(orders, payments, settlements, []);

console.log('\n--- RECONCILIATION SUMMARY ---');
console.log(`Total Orders: ${summary.total_orders}`);
console.log(`Matched Count: ${summary.matched_count}`);
console.log(`Exception Count: ${summary.exception_count}`);
console.log(`Match Rate: ${summary.match_rate}%`);
console.log('Exceptions by Type:', summary.exceptions_by_type);
console.log('Exceptions by Severity:', summary.exceptions_by_severity);

// Parse ground truth
const gtLines = groundTruthCSV.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
const gtHeader = gtLines[0].split(',');

interface GTRecord {
  order_id: string;
  payment_id: string;
  category: string;
  ground_truth_label: string;
  ground_truth_reason: string;
}

const gtMap = new Map<string, GTRecord>();
for (let i = 1; i < gtLines.length; i++) {
  // Safe CSV line parse
  const line = gtLines[i];
  const parts: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let c of line) {
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ',' && !inQuotes) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  parts.push(cur.trim());
  if (parts.length >= 4) {
    gtMap.set(parts[0], {
      order_id: parts[0],
      payment_id: parts[1],
      category: parts[2],
      ground_truth_label: parts[3],
      ground_truth_reason: parts[4] || '',
    });
  }
}

let trueMatches = 0;
let falseMatches = 0;
let trueExceptions = 0;
let falseExceptions = 0;

items.forEach((item) => {
  const oid = item.order_id;
  if (!oid) return;
  const gt = gtMap.get(oid);
  if (!gt) return;

  const isGTMatch = gt.ground_truth_label.startsWith('MATCHED') || gt.ground_truth_label === 'NOT_A_MISMATCH';
  const isEngineMatch = item.status === 'MATCHED';

  if (isGTMatch && isEngineMatch) {
    trueMatches++;
  } else if (!isGTMatch && isEngineMatch) {
    falseMatches++;
    console.error(`FALSE MATCH: ${oid} | GT: ${gt.ground_truth_label} (${gt.category}) | Engine: ${item.status}`);
  } else if (!isGTMatch && !isEngineMatch) {
    trueExceptions++;
  } else if (isGTMatch && !isEngineMatch) {
    falseExceptions++;
    console.error(`FALSE EXCEPTION: ${oid} | GT: ${gt.ground_truth_label} (${gt.category}) | Engine: ${item.status} - Cause: ${item.likely_cause}`);
  }
});

const totalEvaluated = trueMatches + falseMatches + trueExceptions + falseExceptions;
const accuracy = ((trueMatches + trueExceptions) / totalEvaluated) * 100;
const precision = (trueMatches / (trueMatches + falseMatches)) * 100;
const recall = (trueMatches / (trueMatches + falseExceptions)) * 100;
const f1 = (2 * precision * recall) / (precision + recall);

console.log('\n================ AUTOMATED TEST SUITE METRICS ================');
console.log(`Total Evaluated Records: ${totalEvaluated}`);
console.log(`True Matches: ${trueMatches}`);
console.error(`False Matches: ${falseMatches}`);
console.log(`True Exceptions: ${trueExceptions}`);
console.error(`False Exceptions: ${falseExceptions}`);
console.log(`Match Accuracy: ${accuracy.toFixed(2)}%`);
console.log(`Precision: ${precision.toFixed(2)}%`);
console.log(`Recall: ${recall.toFixed(2)}%`);
console.log(`F1 Score: ${f1.toFixed(4)}`);

if (accuracy >= 99.0) {
  console.log('\nSUCCESS: Backend reconciliation engine meets ground truth test oracle criteria!');
} else {
  console.error('\nFAILURE: Reconciliation engine accuracy below required threshold.');
  process.exit(1);
}
