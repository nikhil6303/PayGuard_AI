import fs from 'fs';
import path from 'path';
import { parseOrdersCSV, parsePaymentsCSV, parseSettlementsCSV } from '../src/utils/fileParser';
import { runDeterministicReconciliation } from '../src/engine/reconciliationEngine';

const dataDir = path.join(process.cwd(), 'data_for_training');

const ordersCSV = fs.readFileSync(path.join(dataDir, 'orders.csv'), 'utf-8');
const paymentsCSV = fs.readFileSync(path.join(dataDir, 'payments.csv'), 'utf-8');
const settlementsCSV = fs.readFileSync(path.join(dataDir, 'settlements.csv'), 'utf-8');

const { records: orders } = parseOrdersCSV(ordersCSV);
const { records: payments } = parsePaymentsCSV(paymentsCSV);
const { records: settlements } = parseSettlementsCSV(settlementsCSV);

// Test 1: Original Order Baseline
const baseline = runDeterministicReconciliation(orders, payments, settlements, []);
console.log(`Baseline Matched: ${baseline.summary.matched_count}, Exceptions: ${baseline.summary.exception_count}`);

// Test 2: Shuffled Rows Order
const shuffleArray = <T>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const shuffledOrders = shuffleArray(orders);
const shuffledPayments = shuffleArray(payments);
const shuffledSettlements = shuffleArray(settlements);

const shuffledResult = runDeterministicReconciliation(shuffledOrders, shuffledPayments, shuffledSettlements, []);
console.log(`Shuffled Matched: ${shuffledResult.summary.matched_count}, Exceptions: ${shuffledResult.summary.exception_count}`);

if (shuffledResult.summary.matched_count === baseline.summary.matched_count &&
    shuffledResult.summary.exception_count === baseline.summary.exception_count) {
  console.log('✓ TEST PASSED: Row ordering independence verified!');
} else {
  console.error('✕ TEST FAILED: Row ordering changed reconciliation results!');
}

// Test 3: Partial Data (2-Way: Orders + Payments only)
const twoWayResult = runDeterministicReconciliation(orders, payments, [], []);
console.log(`2-Way Matched: ${twoWayResult.summary.matched_count}, Exceptions: ${twoWayResult.summary.exception_count}`);
if (twoWayResult.summary.matched_count === 605) { // 650 - 45 failed = 605 captured payments
  console.log('✓ TEST PASSED: 2-Way Partial Data Mode verified!');
}
