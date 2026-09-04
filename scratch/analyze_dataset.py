import csv
import os
import glob
from collections import Counter

data_dir = "data_for_training"

files = glob.glob(os.path.join(data_dir, "*.csv"))
print("Files found in data_for_training:", files)

for fpath in files:
    with open(fpath, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        rows = list(reader)
        print(f"\n--- File: {os.path.basename(fpath)} ---")
        print("Header:", header)
        print("Row count:", len(rows))
        if rows:
            print("First row sample:", rows[0])

# Detailed analysis of ground_truth.csv
gt_path = os.path.join(data_dir, "ground_truth.csv")
if os.path.exists(gt_path):
    with open(gt_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        gt_rows = list(reader)
        print(f"\nTotal Ground Truth records: {len(gt_rows)}")
        categories = Counter(r['category'] for r in gt_rows)
        labels = Counter(r['ground_truth_label'] for r in gt_rows)
        print("\nGround Truth Categories Breakdown:")
        for k, v in categories.items():
            print(f"  {k}: {v}")
        print("\nGround Truth Labels Breakdown:")
        for k, v in labels.items():
            print(f"  {k}: {v}")

        # Check matched vs unresolved
        matched_count = sum(1 for r in gt_rows if r['ground_truth_label'].startswith('MATCHED'))
        unresolved_count = sum(1 for r in gt_rows if r['ground_truth_label'].startswith('UNRESOLVED') or 'MISSING' in r['ground_truth_label'] or 'MISMATCH' in r['ground_truth_label'] or 'FAILED' in r['ground_truth_label'])
        print(f"\nSummary:")
        print(f"  Total Expected Matches (MATCHED_*): {matched_count} ({matched_count/len(gt_rows)*100:.2f}%)")
        print(f"  Total Expected Exceptions/Unresolved: {unresolved_count} ({unresolved_count/len(gt_rows)*100:.2f}%)")
