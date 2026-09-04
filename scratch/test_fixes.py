import csv
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
data_dir = "data_for_training"

def load_csv(filename):
    path = os.path.join(data_dir, filename)
    with open(path, "r", encoding="utf-8") as f:
        return list(csv.DictReader(f))

orders = load_csv("orders.csv")
payments = load_csv("payments.csv")
settlements = load_csv("settlements.csv")
ground_truth = load_csv("ground_truth.csv")

payment_by_order_id = {}
for p in payments:
    oid = p['order_id'].strip().lower()
    payment_by_order_id.setdefault(oid, []).append(p)

settlement_by_payment_id = {}
for s in settlements:
    pid = s['payment_id'].strip().lower()
    settlement_by_payment_id[pid] = s

gt_map = {r['order_id']: r for r in ground_truth}

# Analyze refund formulas in ground_truth
print("--- REFUND MATCH SAMPLES IN GROUND TRUTH ---")
refund_samples = [r for r in ground_truth if r['category'] == 'refund_match']
for r in refund_samples[:10]:
    oid = r['order_id']
    pid = r['payment_id']
    o_rec = next(o for o in orders if o['order_id'] == oid)
    s_rec = settlement_by_payment_id.get(pid.lower())
    o_amt = float(o_rec['amount'])
    s_amt = float(s_rec['amount_received']) if s_rec else 0.0
    print(f"OID: {oid} | Reason: {r['ground_truth_reason']}")
    print(f"  Order Amt: {o_amt} | Settlement Amt: {s_amt} | Ratio s_amt/o_amt: {s_amt/o_amt:.4f}")
