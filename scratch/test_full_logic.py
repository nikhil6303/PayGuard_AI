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
payment_by_id = {}
for p in payments:
    pid = p['payment_id'].strip()
    oid = p['order_id'].strip()
    payment_by_id[pid] = p
    payment_by_order_id.setdefault(oid, []).append(p)

settlement_by_payment_id = {}
for s in settlements:
    pid = s['payment_id'].strip()
    settlement_by_payment_id[pid] = s

gt_map = {r['order_id']: r for r in ground_truth}

CONTRACTED_FEE_RATE = 0.02

# Standard refund ratios with 2% fee deducted
REFUND_NET_RATIOS = [
    (1.0 - 0.0) * (1.0 - CONTRACTED_FEE_RATE),   # 0.9800 (0% refund)
    (1.0 - 0.25) * (1.0 - CONTRACTED_FEE_RATE),  # 0.7350 (25% refund)
    (1.0 - 0.50) * (1.0 - CONTRACTED_FEE_RATE),  # 0.4900 (50% refund)
    (1.0 - 0.75) * (1.0 - CONTRACTED_FEE_RATE),  # 0.2450 (75% refund)
    0.0,                                         # 0.0000 (100% refund)
]

def is_valid_settlement_amount(o_amt, s_amt, tolerance=1.0):
    if o_amt <= 0:
        return False, "zero_amount"
    
    expected_exact = round(o_amt * (1.0 - CONTRACTED_FEE_RATE), 2)
    if abs(s_amt - expected_exact) <= tolerance:
        return True, "MATCHED_EXACT"
    
    # Check refund net ratios
    for ratio in REFUND_NET_RATIOS:
        exp_refund_net = round(o_amt * ratio, 2)
        if abs(s_amt - exp_refund_net) <= tolerance:
            if ratio == 0.98:
                return True, "MATCHED_EXACT"
            else:
                return True, "MATCHED_AFTER_REFUND"
                
    return False, "UNRESOLVED_AMOUNT_MISMATCH"

results = []

for order in orders:
    oid = order['order_id']
    gt = gt_map.get(oid, {})
    gt_label = gt.get('ground_truth_label', '')
    gt_cat = gt.get('category', '')
    
    o_amt = float(order['amount'])
    matched_payments = payment_by_order_id.get(oid, [])
    
    status = "UNKNOWN"
    sub_label = ""
    
    if len(matched_payments) == 0:
        status = "UNRESOLVED_MISSING_PAYMENT"
    elif len(matched_payments) > 1:
        status = "UNRESOLVED_DUPLICATE_PAYMENT"
    else:
        pay = matched_payments[0]
        pay_status = pay.get('status', '').lower()
        
        if pay_status == 'failed':
            status = "NOT_A_MISMATCH" # payment failed, no settlement expected
            sub_label = "FAILED_PAYMENT"
        else:
            st = settlement_by_payment_id.get(pay['payment_id'])
            if not st:
                status = "UNRESOLVED_MISSING_SETTLEMENT"
            else:
                s_amt = float(st['amount_received'])
                is_match, match_type = is_valid_settlement_amount(o_amt, s_amt, tolerance=1.0)
                if is_match:
                    status = "MATCHED"
                    sub_label = match_type
                else:
                    status = "UNRESOLVED_AMOUNT_MISMATCH"

    results.append({
        'order_id': oid,
        'gt_label': gt_label,
        'gt_cat': gt_cat,
        'calc_status': status,
        'sub_label': sub_label
    })

# Evaluate against Ground Truth
matched_correct = 0
false_matches = 0
false_exceptions = 0
exceptions_correct = 0

for r in results:
    gt_lbl = r['gt_label']
    calc_st = r['calc_status']
    
    # In Ground Truth: MATCHED_EXACT, MATCHED_DELAYED, MATCHED_AFTER_REFUND are matches.
    # NOT_A_MISMATCH is failed payment (not an exception).
    # UNRESOLVED_* are exceptions.
    
    is_gt_matched = gt_lbl.startswith("MATCHED")
    is_gt_not_mismatch = (gt_lbl == "NOT_A_MISMATCH")
    
    is_calc_matched = (calc_st == "MATCHED" or calc_st == "NOT_A_MISMATCH")
    
    if is_gt_matched and calc_st == "MATCHED":
        matched_correct += 1
    elif is_gt_not_mismatch and calc_st == "NOT_A_MISMATCH":
        matched_correct += 1
    elif not (is_gt_matched or is_gt_not_mismatch) and is_calc_matched:
        false_matches += 1
    elif (is_gt_matched or is_gt_not_mismatch) and not is_calc_matched:
        false_exceptions += 1
        print(f"False Exception: {r['order_id']} | GT: {gt_lbl} ({r['gt_cat']}) | Calc: {calc_st}")
    else:
        exceptions_correct += 1

total = len(results)
print("\n================ BENCHMARK RESULTS ================")
print(f"Total Records: {total}")
print(f"Correctly Identified (Matches + Non-Mismatches + True Exceptions): {matched_correct + exceptions_correct} / {total}")
print(f"False Matches (Engine Matched, GT Unresolved): {false_matches}")
print(f"False Exceptions (Engine Flagged Exception, GT Matched): {false_exceptions}")
accuracy = (matched_correct + exceptions_correct) / total * 100
print(f"Accuracy: {accuracy:.2f}%")
