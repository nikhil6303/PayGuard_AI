import json
import urllib.request
import sys

sys.stdout.reconfigure(encoding='utf-8')

def ask_chat(message):
    payload = json.dumps({"message": message, "history": []}).encode('utf-8')
    req = urllib.request.Request(
        "http://localhost:3000/api/ai/chat",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data.get("reply", "")
    except Exception as e:
        return f"ERROR: {e}"

test_questions = [
    "How many payments match?",
    "How many payments need attention?",
    "How much money did we receive?",
    "How much money are we waiting for?",
    "Why doesn't ORD00021 match?",
    "Show me the biggest problems.",
    "What is a settlement?",
    "Tell me something about Bitcoin."
]

for q in test_questions:
    print(f"\n================ Question: {q} ================")
    ans = ask_chat(q)
    print(ans)
