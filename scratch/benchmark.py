import csv
import os

data_dir = "data_for_training"

def load_csv(filename):
    path = os.path.join(data_dir, filename)
    with open(path, "r", encoding="utf-8") as f:
        return list(csv.DictReader(f))

orders = load_csv("orders.csv")
payments = load_csv("payments.csv")
settlements = load_csv("settlements.csv")
ground_truth = load_csv("ground_truth.csv")

print(f"Loaded {len(orders)} orders, {len(payments)} payments, {len(settlements)} settlements, {len(ground_truth)} ground truth records.")

# Replicate current backend fileParser behavior:
# parseOrdersCSV: order_amount = Math.round(amount), tax_amount = Math.round(amount * 0.18)
# parsePaymentsCSV: payment_amount = Math.round(amount)
# parseSettlementsCSV: settlement_amount = Math.round(amount), fee = Math.round(amount * 0.02), tax_deducted = Math.round(fee * 0.18)

# Replicate current backend reconciliationEngine behavior:
CONTRACTED_FEE_RATE = 0.02
CONTRACTED_GST_RATE = 0.18

# Let's map payments by order_id and payment_id
payment_by_order_id = {}
payment_by_id = {}
for p in payments:
    pid = p['payment_id'].strip().lower()
    oid = p['order_id'].strip().lower()
    payment_by_id[pid] = p
    payment_by_order_id.setdefault(oid, []).append(p)

settlement_by_payment_id = {}
for s in settlements:
    pid = s['payment_id'].strip().lower()
    settlement_by_payment_id[pid] = s

gt_map = {r['order_id']: r for r in ground_truth}

current_matches = 0
current_exceptions = 0

confusion = {
    'TRUE_MATCH': 0,      # GT matched, engine matched
    'FALSE_MATCH': 0,     # GT unresolved, engine matched
    'TRUE_EXCEPTION': 0,  # GT unresolved, engine exception
    'FALSE_EXCEPTION': 0, # GT matched, engine exception
}

failure_reasons = {}

for order in orders:
    oid = order['order_id']
    gt = gt_map.get(oid, {})
    gt_label = gt.get('ground_truth_label', '')
    gt_is_match = gt_label.startswith('MATCHED') or gt_label == 'NOT_A_MISMATCH' # wait, let's test both
    
    o_amt = round(float(order['amount']))
    expected_fee = round(o_amt * CONTRACTED_FEE_RATE)
    expected_tax = round(expected_fee * CONTRACTED_GST_RATE)
    expected_settlement = o_amt - expected_fee - expected_tax

    matched_payments = payment_by_order_id.get(oid.strip().lower(), [])
    
    # Engine logic:
    if len(matched_payments) == 0:
        status = 'MISSING_PAYMENT'
    elif len(matched_payments) > 1:
        status = 'DUPLICATE'
    else:
        pay = matched_payments[0]
        st = settlement_by_payment_id.get(pay['payment_id'].strip().lower())
        if not st:
            status = 'MISSING_SETTLEMENT'
        else:
            s_amt = round(float(st['amount_received']))
            actual_diff = abs(s_amt - expected_settlement)
            if actual_diff > 1.0 and abs(s_amt - o_amt) > 1.0:
                status = 'AMOUNT_MISMATCH'
                reason = f"Actual diff ({actual_diff}) > 1.0: s_amt={s_amt}, exp_settle={expected_settlement} (o_amt={o_amt}, fee={expected_fee}, tax={expected_tax})"
                failure_reasons[oid] = reason
            else:
                status = 'MATCHED'

    is_engine_match = (status == 'MATCHED')
    if is_engine_match:
        current_matches += 1
    else:
        current_exceptions += 1

    gt_is_expected_match = gt_label.startswith('MATCHED')
    
    if gt_is_expected_match and is_engine_match:
        confusion['TRUE_MATCH'] += 1
    elif not gt_is_expected_match and is_engine_match:
        confusion['FALSE_MATCH'] += 1
    elif not gt_is_expected_match and not is_engine_match:
        confusion['TRUE_EXCEPTION'] += 1
    elif gt_is_expected_match and not is_engine_match:
        confusion['FALSE_EXCEPTION'] += 1

print("\n--- CURRENT BACKEND PERFORMANCE SIMULATION ---")
print(f"Total Orders: {len(orders)}")
print(f"Engine Matches: {current_matches} ({current_matches/len(orders)*100:.1f}%)")
print(f"Engine Exceptions: {current_exceptions} ({current_exceptions/len(orders)*100:.1f}%)")

print("\nConfusion Matrix against Ground Truth (Expected Matches = 508):")
print(f"  TRUE MATCH (Expected Match, Engine Matched): {confusion['TRUE_MATCH']}")
print(f"  FALSE MATCH (Expected Exception, Engine Matched): {confusion['FALSE_MATCH']}")
print(f"  TRUE EXCEPTION (Expected Exception, Engine Exception): {confusion['TRUE_EXCEPTION']}")
print(f"  FALSE EXCEPTION (Expected Match, Engine Exception): {confusion['FALSE_EXCEPTION']}")

print("\nSample False Exception Reasons (First 10):")
count = 0
for oid, rsn in failure_reasons.items():
    gt = gt_map.get(oid, {})
    if gt.get('ground_truth_label', '').startswith('MATCHED'):
        print(f"  {oid} (GT: {gt.get('ground_truth_label')}, Cat: {gt.get('category')}): {rsn}")
        count += 1
        if count >= 10:
            break
