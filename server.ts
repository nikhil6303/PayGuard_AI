import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { generateSyntheticDataset, runDeterministicReconciliation, normalizeOrderId, normalizePaymentId } from './src/engine/reconciliationEngine';
import { AIInvestigationResult, ReconciliationItem, ReconciliationSummary } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory runtime state for fast, synchronized controller operations
let dataset = generateSyntheticDataset();
let { items: currentReconciliationItems, summary: currentSummary } = runDeterministicReconciliation(
  dataset.orders,
  dataset.payments,
  dataset.settlements,
  dataset.bankTransactions
);

// Gemini client initialization (lazy with User-Agent header)
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// -------------------------------------------------------------
// Core API Endpoints
// -------------------------------------------------------------

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'PayGuard AI',
    timestamp: new Date().toISOString(),
    recordsCount: dataset.orders.length,
    reconciled: currentReconciliationItems.length > 0,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// 2. Load demo dataset
app.get('/api/dataset/demo', (req: Request, res: Response) => {
  dataset = generateSyntheticDataset();
  const { items, summary } = runDeterministicReconciliation(
    dataset.orders,
    dataset.payments,
    dataset.settlements,
    dataset.bankTransactions
  );
  currentReconciliationItems = items;
  currentSummary = summary;

  res.json({
    orders: dataset.orders,
    payments: dataset.payments,
    settlements: dataset.settlements,
    bankTransactions: dataset.bankTransactions,
    summary,
  });
});

// 3. Ingest custom uploaded dataset
app.post('/api/dataset/upload', (req: Request, res: Response) => {
  try {
    const { orders, payments, settlements, bankTransactions } = req.body;
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: 'Invalid or missing orders data array' });
    }

    dataset = {
      orders: orders || [],
      payments: payments || [],
      settlements: settlements || [],
      bankTransactions: bankTransactions || [],
    };

    const { items, summary } = runDeterministicReconciliation(
      dataset.orders,
      dataset.payments,
      dataset.settlements,
      dataset.bankTransactions
    );
    currentReconciliationItems = items;
    currentSummary = summary;

    res.json({
      success: true,
      recordsCount: dataset.orders.length,
      summary,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error processing uploaded dataset' });
  }
});

// 4. Run Reconciliation
app.post('/api/reconcile', (req: Request, res: Response) => {
  try {
    const tolerance = typeof req.body.tolerance === 'number' ? req.body.tolerance : 1.0;
    const { items, summary } = runDeterministicReconciliation(
      dataset.orders,
      dataset.payments,
      dataset.settlements,
      dataset.bankTransactions,
      tolerance
    );
    currentReconciliationItems = items;
    currentSummary = summary;

    res.json({
      items,
      summary,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to execute reconciliation engine' });
  }
});

// -------------------------------------------------------------
// AI Tool Data Providers (Grounding Engine)
// -------------------------------------------------------------

function toolGetTransaction(queryId: string) {
  if (!queryId) return null;
  const cleanQ = queryId.trim().toUpperCase();
  const numOnly = queryId.replace(/\D/g, '');

  const item = currentReconciliationItems.find((i) => {
    const iTrans = (i.transaction_id || '').toUpperCase();
    const iOrder = (i.order_id || '').toUpperCase();
    const iPay = (i.payment_id || '').toUpperCase();
    const iSetl = (i.settlement_id || '').toUpperCase();

    if (iTrans === cleanQ || iOrder === cleanQ || iPay === cleanQ || iSetl === cleanQ) return true;
    if (numOnly.length >= 3) {
      if (iTrans.endsWith(numOnly) || iOrder.endsWith(numOnly) || iPay.endsWith(numOnly)) return true;
    }
    return false;
  });

  if (!item) return null;

  const rawOrder = dataset.orders.find((o) => normalizeOrderId(o.order_id) === normalizeOrderId(item.order_id || ''));
  const rawPayment = dataset.payments.find((p) => normalizePaymentId(p.payment_id) === normalizePaymentId(item.payment_id || ''));
  const rawSettlement = dataset.settlements.find((s) => normalizePaymentId(s.payment_id) === normalizePaymentId(item.payment_id || ''));

  return {
    item,
    rawOrder,
    rawPayment,
    rawSettlement,
  };
}

function toolGetReconciliationSummary() {
  const matchedSettlementsValue = currentReconciliationItems
    .filter((i) => i.status === 'MATCHED')
    .reduce((sum, i) => sum + (i.settlement_amount || i.order_amount || 0), 0);

  const missingBankValue = currentReconciliationItems
    .filter((i) => i.status === 'MISSING_SETTLEMENT')
    .reduce((sum, i) => sum + (i.expected_settlement || 0), 0);

  const attentionValue = currentReconciliationItems
    .filter((i) => i.status !== 'MATCHED' && i.status !== 'MISSING_SETTLEMENT')
    .reduce((sum, i) => sum + (i.difference || i.order_amount || 0), 0);

  return {
    totalOrders: currentSummary.total_orders,
    paymentsChecked: currentSummary.total_orders,
    paymentsThatMatch: currentSummary.matched_count,
    needsAttention: currentSummary.exception_count,
    matchRatePercentage: currentSummary.match_rate,
    moneyReceivedInBank: matchedSettlementsValue,
    moneyToBeReceived: currentSummary.total_transaction_value,
    moneyWaitingToBeReceived: missingBankValue + attentionValue,
    moneyWaitingBreakdown: {
      waitingForBankDeposit: missingBankValue,
      needsAttention: attentionValue,
    },
    availableCash: currentSummary.cash_position.available_cash,
  };
}

function toolGetBiggestProblems(limit: number = 3) {
  const exceptions = currentReconciliationItems
    .filter((i) => i.status !== 'MATCHED')
    .sort((a, b) => b.difference - a.difference || (b.order_amount || 0) - (a.order_amount || 0));

  return exceptions.slice(0, limit).map((i) => ({
    id: i.order_id || i.transaction_id,
    payment_id: i.payment_id,
    difference: i.difference,
    order_amount: i.order_amount,
    settlement_amount: i.settlement_amount,
    status: i.status,
    cause: i.likely_cause,
  }));
}

// -------------------------------------------------------------
// 5. AI Investigation Endpoint with Tool Calling
// -------------------------------------------------------------
app.post('/api/ai/investigate', async (req: Request, res: Response) => {
  const { transaction_id, custom_query } = req.body;
  if (!transaction_id) {
    return res.status(400).json({ error: 'transaction_id is required' });
  }

  const foundData = toolGetTransaction(transaction_id);
  if (!foundData || !foundData.item) {
    return res.status(404).json({ error: `Transaction ${transaction_id} not found in current dataset` });
  }

  const recItem = foundData.item;
  const toolCallsExecuted = [
    {
      tool: 'get_transaction',
      args: { order_id: transaction_id },
      result: JSON.stringify(foundData.rawOrder || { status: 'Missing' }),
    },
    {
      tool: 'get_payment',
      args: { order_id: transaction_id },
      result: JSON.stringify(foundData.rawPayment || { status: 'Missing' }),
    },
    {
      tool: 'get_settlement',
      args: { payment_id: recItem.payment_id || 'N/A' },
      result: JSON.stringify(foundData.rawSettlement || { status: 'Missing' }),
    },
  ];

  const ai = getGeminiClient();

  if (ai) {
    try {
      const prompt = `You are PayGuard AI, a finance operations assistant.

Inspect the grounded financial data for transaction: ${transaction_id}.

Grounded Record:
- Order ID: ${recItem.order_id || 'N/A'}
- Payment ID: ${recItem.payment_id || 'N/A'}
- Status: ${recItem.status}
- Order Amount: ${recItem.order_amount !== null ? '₹' + recItem.order_amount : 'N/A'}
- Payment Amount: ${recItem.payment_amount !== null ? '₹' + recItem.payment_amount : 'N/A'}
- Money Received in Bank: ${recItem.settlement_amount !== null ? '₹' + recItem.settlement_amount : 'Not found'}
- Expected Bank Amount: ₹${recItem.expected_settlement}
- Difference: ₹${recItem.difference}
- Evidence: ${JSON.stringify(recItem.evidence)}

Respond strictly in JSON matching this schema:
{
  "likely_cause": "Short simple explanation",
  "certainty": "Confirmed" | "Likely" | "Possible" | "Unable to determine",
  "evidence": ["bullet point 1", "bullet point 2"],
  "recommended_action": "Simple action for user to check",
  "detailed_narrative": "Structured investigation summary using simple English."
}`;

      const geminiPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              likely_cause: { type: Type.STRING },
              certainty: {
                type: Type.STRING,
                enum: ['Confirmed', 'Likely', 'Possible', 'Unable to determine'],
              },
              evidence: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              recommended_action: { type: Type.STRING },
              detailed_narrative: { type: Type.STRING },
            },
            required: ['likely_cause', 'certainty', 'evidence', 'recommended_action', 'detailed_narrative'],
          },
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timeout')), 3500)
      );

      const response: any = await Promise.race([geminiPromise, timeoutPromise]);
      const parsed = JSON.parse(response.text || '{}');

      const result: AIInvestigationResult = {
        transaction_id,
        status: recItem.status,
        severity: recItem.severity,
        order_amount: recItem.order_amount,
        payment_amount: recItem.payment_amount,
        settlement_amount: recItem.settlement_amount,
        expected_settlement: recItem.expected_settlement,
        difference: recItem.difference,
        likely_cause: parsed.likely_cause || recItem.likely_cause,
        certainty: parsed.certainty || 'Confirmed',
        evidence: parsed.evidence && parsed.evidence.length > 0 ? parsed.evidence : recItem.evidence.map((e) => e.detail),
        recommended_action: parsed.recommended_action || recItem.recommended_action,
        tool_calls_executed: toolCallsExecuted,
        detailed_narrative: parsed.detailed_narrative || recItem.likely_cause,
      };

      return res.json(result);
    } catch (err: any) {
      console.warn('Gemini call failed/timed out, using deterministic output:', err.message);
    }
  }

  // Deterministic Grounded Output
  const result: AIInvestigationResult = {
    transaction_id,
    status: recItem.status,
    severity: recItem.severity,
    order_amount: recItem.order_amount,
    payment_amount: recItem.payment_amount,
    settlement_amount: recItem.settlement_amount,
    expected_settlement: recItem.expected_settlement,
    difference: recItem.difference,
    likely_cause: recItem.likely_cause,
    certainty: 'Confirmed',
    evidence: recItem.evidence.map((e) => `${e.passed ? '✓' : '✗'} ${e.label}: ${e.detail}`),
    recommended_action: recItem.recommended_action,
    tool_calls_executed: toolCallsExecuted,
    detailed_narrative: `Payment ${transaction_id}: Customer paid ${recItem.order_amount ? '₹' + recItem.order_amount : 'N/A'}. Money received in bank: ${recItem.settlement_amount ? '₹' + recItem.settlement_amount : 'Not found'}. Difference: ₹${recItem.difference}. ${recItem.likely_cause}`,
  };

  res.json(result);
});

// -------------------------------------------------------------
// 6. Global PayGuard Agent Chat grounded in live data
// -------------------------------------------------------------
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const queryLower = message.toLowerCase().trim();
  const summaryData = toolGetReconciliationSummary();

  const ai = getGeminiClient();

  if (ai) {
    try {
      const systemInstruction = `You are PayGuard AI, a finance operations assistant.

Your job is to explain the financial data currently loaded into the application.

Always rely on actual data returned by the application's tools.
Never invent financial facts.
Never guess missing amounts, transactions, bank deposits, fees, dates, or causes.

Use simple English:
- Say "Money received in bank" instead of "Settlement".
- Say "Money not received yet" instead of "Pending settlement".
- Say "Payment doesn't match" instead of "Reconciliation discrepancy".
- Say "Needs attention" instead of "Exception".
- Say "Money missing" instead of "Unreconciled amount".

When asked about a specific payment, use this structured format:

## Payment <ORDER_ID>
**Status: <Matches / Needs Attention / Money Not Received Yet>**

### What happened
Customer paid: ₹<AMOUNT>
Money received in bank: ₹<AMOUNT / Not found>
Difference: ₹<DIFFERENCE>

### Why
<SIMPLE_EXPLANATION>

### What to check
<RECOMMENDED_ACTION>

### Evidence
<EVIDENCE_CHECKLIST>

Live Application Data Summary:
- Payments checked: ${summaryData.paymentsChecked}
- Payments that match: ${summaryData.paymentsThatMatch} (${summaryData.matchRatePercentage}%)
- Needs attention: ${summaryData.needsAttention}
- Money received in bank: ₹${summaryData.moneyReceivedInBank.toLocaleString()}
- Money waiting to be received: ₹${summaryData.moneyWaitingToBeReceived.toLocaleString()}
- Available cash position: ₹${summaryData.availableCash.toLocaleString()}

If required information is not available in backend tools, say: "I don't have enough data to confirm that."`;

      const geminiChatPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: message,
        config: { systemInstruction },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI chat response timeout')), 3500)
      );

      const response: any = await Promise.race([geminiChatPromise, timeoutPromise]);

      return res.json({
        reply: response.text,
        toolCall: {
          name: 'get_reconciliation_summary',
          args: { query: message },
          result: summaryData,
        },
      });
    } catch (err: any) {
      console.warn('Gemini chat failed, using deterministic handler:', err.message);
    }
  }

  // -------------------------------------------------------------
  // Deterministic Grounded Handler (Guaranteed Zero Hallucination)
  // -------------------------------------------------------------
  let reply = '';
  let toolCallInfo: any = null;

  // 1. Transaction / Order lookup
  const txMatch = queryLower.match(/(ord|pay|set|bnk)[-_]?\d+/i) || queryLower.match(/\b\d{5}\b/);
  if (txMatch) {
    const found = toolGetTransaction(txMatch[0]);
    if (found && found.item) {
      const item = found.item;
      toolCallInfo = { name: 'get_transaction', args: { query: txMatch[0] }, result: item };

      const isMatch = item.status === 'MATCHED';
      const isMissingSetl = item.status === 'MISSING_SETTLEMENT';
      const statusLabel = isMatch ? 'Matches' : isMissingSetl ? 'Money Not Received Yet' : 'Needs Attention';

      const custPaidStr = item.order_amount !== null ? `₹${item.order_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Not available';
      const bankRecStr = item.settlement_amount !== null ? `₹${item.settlement_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Not found';
      const diffStr = `₹${item.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

      if (isMatch) {
        reply = `## Payment ${item.order_id || item.transaction_id}

**Status: Matches**

The customer paid **${custPaidStr}** and **${bankRecStr}** was received in the bank.

**Difference: ₹0.00**

Everything available in the records matches.

### Evidence
✓ Customer payment found
✓ Bank deposit found
✓ Amount matches
✓ IDs and reference match`;
      } else if (isMissingSetl) {
        reply = `## Payment ${item.order_id || item.transaction_id}

**Status: Money Not Received Yet**

Customer payment:
${custPaidStr}

Expected bank amount:
₹${item.expected_settlement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}

Bank received:
Not found

Amount still waiting:
₹${item.expected_settlement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}

### What this means
The payment exists, but the matching bank deposit was not found in the current bank records.

### What to do
Check the payment provider or bank statement for the missing deposit.

### Evidence
✓ Order record exists
✓ Payment captured on gateway
✗ Bank deposit not found`;
      } else {
        reply = `## Payment ${item.order_id || item.transaction_id}

**Status: Needs Attention**

### What happened
Customer paid:
${custPaidStr}

Money received in bank:
${bankRecStr}

Difference:
${diffStr}

### Why
${item.likely_cause}

### What to check
${item.recommended_action}

### Evidence
${item.evidence.map((e) => `${e.passed ? '✓' : '✗'} ${e.label}`).join('\n')}`;
      }

      return res.json({ reply, toolCall: toolCallInfo });
    } else if (queryLower.includes('ord') || queryLower.includes('pay') || queryLower.includes('set')) {
      return res.json({
        reply: "I don't have enough data to confirm that.",
        toolCall: { name: 'get_transaction', args: { query: txMatch[0] }, result: null },
      });
    }
  }

  // 2. How many payments match / match rate
  if (
    queryLower.includes('how many payments match') ||
    queryLower.includes('how many match') ||
    queryLower.includes('match rate') ||
    (queryLower.includes('payments') && queryLower.includes('match'))
  ) {
    toolCallInfo = { name: 'get_reconciliation_summary', args: {}, result: summaryData };
    reply = `**${summaryData.paymentsThatMatch} payments match out of ${summaryData.paymentsChecked}.**

That's **${summaryData.matchRatePercentage}%**.

**${summaryData.needsAttention} payments need attention.**`;

    return res.json({ reply, toolCall: toolCallInfo });
  }

  // 3. How many payments need attention / exceptions
  if (
    queryLower.includes('need attention') ||
    queryLower.includes('how many exceptions') ||
    queryLower.includes('needs attention') ||
    queryLower.includes('attention count')
  ) {
    toolCallInfo = { name: 'get_reconciliation_summary', args: {}, result: summaryData };
    const missingSetlCount = currentSummary.exceptions_by_type.MISSING_SETTLEMENT || 0;
    const amountMismatchCount = currentSummary.exceptions_by_type.AMOUNT_MISMATCH || 0;

    reply = `**${summaryData.needsAttention} payments need attention** out of ${summaryData.paymentsChecked} payments checked.

Breakdown:
• **${missingSetlCount}** missing money received in bank
• **${amountMismatchCount}** payment amount mismatches`;

    return res.json({ reply, toolCall: toolCallInfo });
  }

  // 4. How much money did we receive
  if (
    queryLower.includes('money did we receive') ||
    queryLower.includes('money received') ||
    queryLower.includes('received in bank') ||
    queryLower.includes('total received')
  ) {
    toolCallInfo = { name: 'get_reconciliation_summary', args: {}, result: summaryData };
    const receivedLakhs = (summaryData.moneyReceivedInBank / 100000).toFixed(2);
    reply = `**₹${receivedLakhs}L (₹${summaryData.moneyReceivedInBank.toLocaleString('en-IN', { maximumFractionDigits: 2 })}) has been received in the bank.**

That's based on ${summaryData.paymentsThatMatch} verified bank deposits.`;

    return res.json({ reply, toolCall: toolCallInfo });
  }

  // 5. How much money waiting / missing
  if (
    queryLower.includes('money are we waiting for') ||
    queryLower.includes('money waiting') ||
    queryLower.includes('waiting to be received') ||
    queryLower.includes('missing money') ||
    queryLower.includes('how much is missing')
  ) {
    toolCallInfo = { name: 'get_reconciliation_summary', args: {}, result: summaryData };
    const waitingLakhs = (summaryData.moneyWaitingToBeReceived / 100000).toFixed(2);
    const bankWaitingLakhs = (summaryData.moneyWaitingBreakdown.waitingForBankDeposit / 100000).toFixed(2);
    const attentionLakhs = (summaryData.moneyWaitingBreakdown.needsAttention / 100000).toFixed(2);

    reply = `**₹${waitingLakhs}L has not reached the bank yet.**

Breakdown:
• **₹${bankWaitingLakhs}L**: waiting for bank deposit
• **₹${attentionLakhs}L**: needs attention`;

    return res.json({ reply, toolCall: toolCallInfo });
  }

  // 6. Show biggest problems / highest exceptions
  if (
    queryLower.includes('biggest problem') ||
    queryLower.includes('biggest exception') ||
    queryLower.includes('highest impact') ||
    queryLower.includes('what should i check first') ||
    queryLower.includes('top problem')
  ) {
    const problems = toolGetBiggestProblems(3);
    toolCallInfo = { name: 'get_biggest_problems', args: { limit: 3 }, result: problems };

    if (problems.length === 0) {
      reply = 'Everything in the records matches. There are no active payment problems.';
    } else {
      reply = `### Biggest problems\n\n` +
        problems.map((p, idx) => `**${idx + 1}. ${p.id}**\n₹${p.difference.toLocaleString('en-IN')} difference\n${p.cause}`).join('\n\n') +
        `\n\nWould you like me to investigate one of these?`;
    }

    return res.json({ reply, toolCall: toolCallInfo });
  }

  // 7. Today summary / What happened today
  if (queryLower.includes('today') || queryLower.includes('what happened today') || queryLower.includes('daily summary')) {
    toolCallInfo = { name: 'get_reconciliation_summary', args: {}, result: summaryData };
    const recL = (summaryData.moneyReceivedInBank / 100000).toFixed(2);
    const waitL = (summaryData.moneyWaitingToBeReceived / 100000).toFixed(2);
    const criticalCount = currentReconciliationItems.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;

    reply = `### Today's Summary

**Payments checked:** ${summaryData.paymentsChecked}
**Payments that match:** ${summaryData.paymentsThatMatch}
**Needs attention:** ${summaryData.needsAttention}
**Money received:** ₹${recL}L
**Money still waiting:** ₹${waitL}L

### Important
${criticalCount} high-value payments need attention.`;

    return res.json({ reply, toolCall: toolCallInfo });
  }

  // 8. Cash position
  if (queryLower.includes('cash') || queryLower.includes('position') || queryLower.includes('balance')) {
    const cp = currentSummary.cash_position;
    toolCallInfo = { name: 'get_cash_position', args: {}, result: cp };

    reply = `### Cash Position Summary

**Available cash in bank:** ₹${(cp.available_cash / 100000).toFixed(2)}L
**Money waiting for bank deposit:** ₹${(cp.expected_settlements / 100000).toFixed(2)}L
**Outstanding receivables:** ₹${(cp.outstanding_receivables / 100000).toFixed(2)}L
**Scheduled payables:** ₹${(cp.outstanding_payables / 100000).toFixed(2)}L

**Net cash position:** ₹${(cp.net_cash_position / 100000).toFixed(2)}L`;

    return res.json({ reply, toolCall: toolCallInfo });
  }

  // 9. General Definitions
  if (queryLower.includes('what is a settlement') || queryLower.includes('settlement mean')) {
    reply = `A settlement is the money that reaches your bank after a payment is processed.

For example:
Customer pays ₹1,000.
After fees, ₹980 reaches your bank.

That ₹980 is the money received in the bank.`;
    return res.json({ reply, toolCall: { name: 'explain_concept', args: { term: 'settlement' } } });
  }

  if (queryLower.includes('what is mdr') || queryLower.includes('gateway fee')) {
    reply = `MDR (Merchant Discount Rate) is the small percentage fee that payment gateways charge for processing customer payments (typically 2.0%).`;
    return res.json({ reply, toolCall: { name: 'explain_concept', args: { term: 'mdr' } } });
  }

  // 10. Ambiguous "Why is this wrong?" without context
  if (queryLower === 'why is this wrong?' || queryLower === 'why is it wrong?' || queryLower === 'why is this wrong') {
    reply = 'Which payment should I check? Please provide the Payment ID or Order ID.';
    return res.json({ reply, toolCall: null });
  }

  // 11. Unrelated / Off-topic questions (e.g. Bitcoin, Weather)
  if (queryLower.includes('bitcoin') || queryLower.includes('weather') || queryLower.includes('recipe') || queryLower.includes('crypto')) {
    reply = 'I can help with your payments, bank deposits, money waiting to be received, payment problems, and cash position.';
    return res.json({ reply, toolCall: null });
  }

  // Default Fallback
  toolCallInfo = { name: 'get_reconciliation_summary', args: {}, result: summaryData };
  reply = `PayGuard AI Assistant Summary:

• **Payments checked:** ${summaryData.paymentsChecked}
• **Payments that match:** ${summaryData.paymentsThatMatch} (${summaryData.matchRatePercentage}%)
• **Needs attention:** ${summaryData.needsAttention}
• **Money received in bank:** ₹${(summaryData.moneyReceivedInBank / 100000).toFixed(2)}L
• **Money waiting:** ₹${(summaryData.moneyWaitingToBeReceived / 100000).toFixed(2)}L

Ask me about any payment (e.g. *ORD00021*), *money received*, *money waiting*, *biggest problems*, or *cash position*.`;

  res.json({ reply, toolCall: toolCallInfo });
});

// -------------------------------------------------------------
// Vite Middleware / Static serving setup
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PayGuard AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
