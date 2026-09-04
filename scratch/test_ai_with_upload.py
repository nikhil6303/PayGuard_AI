import json
import urllib.request
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

orders_formatted = [
    {
        "order_id": r["order_id"],
        "customer_id": "CUST-100",
        "customer_name": "Test Customer",
        "order_amount": float(r["amount"]),
        "tax_amount": round(float(r["amount"]) * 0.18, 2),
        "currency": "INR",
        "order_date": r["date"],
        "product_category": "Enterprise Services",
        "status": "completed"
    }
    for r in orders
]

payments_formatted = [
    {
        "payment_id": r["payment_id"],
        "order_id": r["order_id"],
        "payment_amount": float(r["amount"]),
        "payment_status": r["status"].lower(),
        "payment_date": r["date"],
        "gateway": "Razorpay",
        "payment_method": "UPI",
        "auth_code": "AUTH-TEST"
    }
    for r in payments
]

settlements_formatted = [
    {
        "settlement_id": r["settlement_id"],
        "payment_id": r["payment_id"],
        "settlement_amount": float(r["amount_received"]),
        "fee": round(float(r["amount_received"]) * 0.02, 2),
        "tax_deducted": 0,
        "settlement_status": "settled",
        "settlement_date": r["date"],
        "settlement_ref": f"UTR-{r['settlement_id']}"
    }
    for r in settlements
]

payload = json.dumps({
    "orders": orders_formatted,
    "payments": payments_formatted,
    "settlements": settlements_formatted,
    "bankTransactions": []
}).encode('utf-8')

req = urllib.request.Request(
    "http://localhost:3000/api/dataset/upload",
    data=payload,
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    print("Dataset uploaded to backend!")

def ask_chat(message):
    p = json.dumps({"message": message, "history": []}).encode('utf-8')
    r = urllib.request.Request(
        "http://localhost:3000/api/ai/chat",
        data=p,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(r) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        return data.get("reply", "")

test_questions = [
    "How many payments match?",
    "How many payments need attention?",
    "How much money did we receive?",
    "How much money are we waiting for?",
    "Why doesn't ORD00021 match?",
    "Is ORD00001 okay?",
    "Why is ORD00009 wrong?",
    "Show me the biggest problems.",
    "What is a settlement?",
    "Tell me something about Bitcoin."
]

for q in test_questions:
    print(f"\n================ Question: {q} ================")
    ans = ask_chat(q)
    print(ans)
