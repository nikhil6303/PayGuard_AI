import csv
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

data_dir = "data_for_training"

def load_csv(filename, key_col):
    data = {}
    path = os.path.join(data_dir, filename)
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            data[r[key_col]] = r
    return data

orders = load_csv("orders.csv", "order_id")
payments = load_csv("payments.csv", "payment_id")
settlements = {}
with open(os.path.join(data_dir, "settlements.csv"), "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for r in reader:
        settlements[r["payment_id"]] = r

with open(os.path.join(data_dir, "ground_truth.csv"), "r", encoding="utf-8") as f:
    gt_rows = list(csv.DictReader(f))

for cat in ['refund_match', 'failed_payment']:
    print(f"\n=================== CATEGORY: {cat} ===================")
    samples = [r for r in gt_rows if r["category"] == cat][:3]
    for sample in samples:
        oid = sample["order_id"]
        pid = sample["payment_id"]
        lbl = sample["ground_truth_label"]
        rsn = sample["ground_truth_reason"]
        
        ord_rec = orders.get(oid)
        pay_rec = payments.get(pid)
        set_rec = settlements.get(pid)
        
        print(f"\nOrder ID: {oid} | Payment ID: {pid} | GT Label: {lbl}")
        print(f"GT Reason: {rsn}")
        print(f"Order rec: {ord_rec}")
        print(f"Payment rec: {pay_rec}")
        print(f"Settlement rec: {set_rec}")
        
        if ord_rec and pay_rec and set_rec:
            o_amt = float(ord_rec["amount"])
            p_amt = float(pay_rec["amount"])
            s_amt = float(set_rec["amount_received"])
            fee_2pct = round(o_amt * 0.02, 2)
            expected_net = round(o_amt - fee_2pct, 2)
            print(f"Calculations: Order Amt={o_amt}, Pay Amt={p_amt}, Settled={s_amt}")
