// "Build Sentra Row" Code node (Run Once for Each Item).
// Joins the email fields with Gemini's analysis into the 17 columns of the
// Sentra `feedback` sheet. If Gemini failed or returned unusable output, the
// email is still saved (marked Unclassified) so no feedback is lost.
const email = $('Extract Email Fields').item.json;

function findAnalysis(v, depth = 0) {
  if (depth > 6 || v == null) return null;
  if (typeof v === 'string') {
    const m = v.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return findAnalysis(JSON.parse(m[0]), depth + 1); } catch { return null; }
  }
  if (typeof v !== 'object') return null;
  if (!Array.isArray(v) && typeof v.sentiment === 'string') return v;
  for (const child of Object.values(v)) {
    const found = findAnalysis(child, depth + 1);
    if (found) return found;
  }
  return null;
}

const pick = (value, allowed, fallback) => {
  const v = String(value ?? '').trim().toLowerCase();
  return allowed.includes(v) ? v : fallback;
};
const THEMES = ['Delivery', 'Customer Support', 'Product Quality', 'Pricing & Billing', 'Mobile App', 'Staff & Service', 'Returns & Refunds', 'Website & Checkout', 'General'];
const CATEGORIES = ['Complaint', 'Praise', 'Suggestion', 'Question', 'Bug Report'];
const matchCase = (value, list, fallback) => list.find((x) => x.toLowerCase() === String(value ?? '').trim().toLowerCase()) ?? (String(value ?? '').trim() || fallback);

const ai = findAnalysis($json);
const score = Number(ai?.sentiment_score);
const issue = String(ai?.issue ?? '').trim();

return {
  json: {
    id: email.gmail_message_id,
    original_message: email.body,
    subject: email.subject,
    source: 'Gmail',
    received_at: email.received_at,
    customer_name: email.customer_name,
    customer_email: email.customer_email,
    sentiment: ai ? pick(ai.sentiment, ['positive', 'neutral', 'negative'], 'neutral') : 'neutral',
    sentiment_score: Number.isFinite(score) ? Math.max(-1, Math.min(1, Math.round(score * 100) / 100)) : 0,
    category: ai ? matchCase(ai.category, CATEGORIES, 'Uncategorized') : 'Unclassified',
    theme: ai ? matchCase(ai.theme, THEMES, 'General') : 'Unclassified',
    issue: /^(none|null|n\/a|no issue)?$/i.test(issue) ? '' : issue,
    severity: ai ? pick(ai.severity, ['low', 'medium', 'high', 'critical'], 'low') : 'low',
    ai_summary: ai ? String(ai.ai_summary ?? ai.summary ?? '').trim() : 'AI analysis unavailable. Review this message manually.',
    status: 'new',
    created_at: new Date().toISOString(),
    gmail_message_id: email.gmail_message_id,
  },
};
