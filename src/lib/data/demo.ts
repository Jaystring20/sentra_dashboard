import type { FeedbackRecord, FeedbackStatus, Sentiment, Severity } from '../types'

/**
 * Deterministic demo dataset. It mimics what the n8n workflow writes after the
 * AI analysis step, so every page of Sentra can be explored without a database.
 * Patterns are planted on purpose (a rising support-delay complaint, a billing
 * risk, consistent praise for staff) so the insight engine has something to find.
 */

interface Template {
  theme: string
  category: string
  issue: string | null
  sentiment: Sentiment
  severity: Severity
  /** relative frequency as a function of days ago (0 = today) */
  weight: (daysAgo: number) => number
  subjects: string[]
  messages: string[]
  summary: string
}

const flat = (w: number) => () => w
const rising = (base: number, peak: number, window = 21) => (d: number) =>
  d < window ? base + (peak - base) * (1 - d / window) : base
const fading = (recent: number, old: number, window = 30) => (d: number) => (d < window ? recent : old)

const TEMPLATES: Template[] = [
  {
    theme: 'Customer Support',
    category: 'Complaint',
    issue: 'Slow support response time',
    sentiment: 'negative',
    severity: 'high',
    weight: rising(0.5, 8),
    subjects: ['Still waiting for a reply', 'No response to my ticket', 'Support is too slow'],
    messages: [
      'I opened a support ticket five days ago and still have not heard anything back. This is really frustrating.',
      'It took over a week for anyone from support to respond to my email. By then I had already solved it myself.',
      'Your support team keeps saying they will get back to me within 24 hours, but it has been three days.',
      'I have emailed support twice about my order and nobody has replied. Is anyone actually reading these?',
      'Response times from customer service have gotten noticeably worse over the last few weeks.',
    ],
    summary: 'Customer is frustrated by a multi-day wait for a support reply.',
  },
  {
    theme: 'Customer Support',
    category: 'Praise',
    issue: null,
    sentiment: 'positive',
    severity: 'low',
    weight: fading(0.8, 2),
    subjects: ['Thank you, support team', 'Great help today'],
    messages: [
      'Huge thanks to the support agent who walked me through the setup. Patient and very knowledgeable.',
      'Support solved my problem in one email. Fast and friendly, exactly what I needed.',
    ],
    summary: 'Customer praises a support agent for a fast, helpful resolution.',
  },
  {
    theme: 'Delivery',
    category: 'Complaint',
    issue: 'Late delivery',
    sentiment: 'negative',
    severity: 'medium',
    weight: flat(2.2),
    subjects: ['Order arrived late', 'Where is my package?', 'Delivery delay'],
    messages: [
      'My order was supposed to arrive on Monday and it showed up on Friday. I needed it for an event.',
      'Tracking said out for delivery for three days in a row. The package finally came a week late.',
      'Delivery took much longer than the estimate shown at checkout.',
    ],
    summary: 'Order arrived several days after the promised delivery date.',
  },
  {
    theme: 'Delivery',
    category: 'Complaint',
    issue: 'Damaged package',
    sentiment: 'negative',
    severity: 'medium',
    weight: flat(0.9),
    subjects: ['Item arrived damaged', 'Broken on arrival'],
    messages: [
      'The box was crushed and the item inside was cracked. Very disappointing.',
      'My order arrived with the packaging torn open and one of the items missing.',
    ],
    summary: 'Package arrived damaged; customer expects a replacement.',
  },
  {
    theme: 'Delivery',
    category: 'Praise',
    issue: null,
    sentiment: 'positive',
    severity: 'low',
    weight: flat(1.6),
    subjects: ['Super fast delivery', 'Arrived early!'],
    messages: [
      'Ordered on Tuesday and it arrived Wednesday morning. Impressive!',
      'Delivery was quicker than expected and the packaging was great.',
    ],
    summary: 'Customer is pleased the order arrived quickly.',
  },
  {
    theme: 'Pricing & Billing',
    category: 'Complaint',
    issue: 'Duplicate charge',
    sentiment: 'negative',
    severity: 'critical',
    weight: rising(0.15, 1.8, 10),
    subjects: ['Charged twice!', 'Double billing on my card', 'Unauthorized second charge'],
    messages: [
      'I was charged twice for the same order. Please refund the duplicate payment immediately.',
      'My bank statement shows two identical charges from you this month. I only placed one order.',
      'After updating my payment method I was billed twice. This needs to be fixed urgently.',
    ],
    summary: 'Customer was billed twice for a single order and requests an urgent refund.',
  },
  {
    theme: 'Pricing & Billing',
    category: 'Suggestion',
    issue: 'Pricing too high',
    sentiment: 'neutral',
    severity: 'low',
    weight: flat(1.0),
    subjects: ['Pricing feedback', 'Any discounts planned?'],
    messages: [
      'I like the product but the price went up again. Would you consider a loyalty discount?',
      'It would be great to have a cheaper annual plan option.',
    ],
    summary: 'Customer suggests a loyalty discount or cheaper plan.',
  },
  {
    theme: 'Product Quality',
    category: 'Praise',
    issue: null,
    sentiment: 'positive',
    severity: 'low',
    weight: flat(2.6),
    subjects: ['Love the product', 'Excellent quality', 'Exceeded expectations'],
    messages: [
      'The quality is excellent. It feels much more premium than anything else I have tried at this price.',
      'I have been using it every day for two months and it still works perfectly. Great build quality.',
      'Absolutely love it. I already recommended it to three friends.',
    ],
    summary: 'Customer is very happy with product quality and durability.',
  },
  {
    theme: 'Product Quality',
    category: 'Complaint',
    issue: 'Product stopped working',
    sentiment: 'negative',
    severity: 'high',
    weight: flat(0.8),
    subjects: ['Stopped working after a week', 'Defective unit'],
    messages: [
      'The device stopped charging after only a week of normal use.',
      'Mine stopped working after a few days. I expected better for the price.',
    ],
    summary: 'Product failed shortly after purchase.',
  },
  {
    theme: 'Mobile App',
    category: 'Bug Report',
    issue: 'App crashes on login',
    sentiment: 'negative',
    severity: 'high',
    weight: fading(1.4, 0.4, 35),
    subjects: ['App keeps crashing', 'Cannot log in on Android'],
    messages: [
      'The app crashes every time I try to log in since the latest update.',
      'Since the update the app freezes on the login screen and then closes.',
      'I cannot sign in on my phone anymore, the app just crashes.',
    ],
    summary: 'App crashes during login after the latest update.',
  },
  {
    theme: 'Mobile App',
    category: 'Suggestion',
    issue: null,
    sentiment: 'neutral',
    severity: 'low',
    weight: flat(1.0),
    subjects: ['Feature request: dark mode', 'App suggestion'],
    messages: [
      'Would love a dark mode in the app, and maybe order notifications on the lock screen.',
      'Could you add a way to reorder past purchases in one tap?',
    ],
    summary: 'Customer requests new app features.',
  },
  {
    theme: 'Staff & Service',
    category: 'Praise',
    issue: null,
    sentiment: 'positive',
    severity: 'low',
    weight: flat(2.4),
    subjects: ['Wonderful staff', 'Shout-out to your team'],
    messages: [
      'The staff at the pickup point were incredibly friendly and helpful.',
      'Your team member went above and beyond to help me find the right product. Please pass on my thanks.',
      'Everyone I dealt with was courteous and professional. Great experience overall.',
    ],
    summary: 'Customer praises friendly, helpful staff.',
  },
  {
    theme: 'Returns & Refunds',
    category: 'Complaint',
    issue: 'Refund delay',
    sentiment: 'negative',
    severity: 'medium',
    weight: flat(1.2),
    subjects: ['Refund not received', 'Return processed?'],
    messages: [
      'I returned the item three weeks ago and still have not received my refund.',
      'The return label worked but the refund is taking forever.',
    ],
    summary: 'Customer has not yet received a refund for a returned item.',
  },
  {
    theme: 'Returns & Refunds',
    category: 'Question',
    issue: null,
    sentiment: 'neutral',
    severity: 'low',
    weight: flat(0.8),
    subjects: ['Return policy question', 'Can I exchange this?'],
    messages: [
      'Can I exchange an item for a different size, or do I need to return it and reorder?',
      'What is the return window for sale items?',
    ],
    summary: 'Customer asks about the return and exchange policy.',
  },
  {
    theme: 'Website & Checkout',
    category: 'Bug Report',
    issue: 'Checkout payment error',
    sentiment: 'negative',
    severity: 'high',
    weight: flat(0.7),
    subjects: ['Payment failed at checkout', 'Checkout error'],
    messages: [
      'I keep getting a payment error at checkout even though my card works everywhere else.',
      'The checkout page spins forever and then says something went wrong.',
    ],
    summary: 'Customer cannot complete checkout due to a payment error.',
  },
  {
    theme: 'Website & Checkout',
    category: 'Praise',
    issue: null,
    sentiment: 'positive',
    severity: 'low',
    weight: flat(1.0),
    subjects: ['Easy to order', 'Nice new website'],
    messages: [
      'The new website is so much easier to navigate. Checkout took less than a minute.',
      'Ordering online was smooth and simple.',
    ],
    summary: 'Customer finds the website easy to use.',
  },
]

const FIRST = ['Amara', 'Liam', 'Sofia', 'Noah', 'Chen', 'Fatima', 'Lucas', 'Priya', 'Mateo', 'Zara', 'Ethan', 'Aisha', 'Jonas', 'Mei', 'Daniel', 'Ngozi', 'Olivia', 'Kwame', 'Elena', 'Ravi']
const LAST = ['Okafor', 'Smith', 'Rossi', 'Kim', 'Wei', 'Hassan', 'Silva', 'Patel', 'Garcia', 'Ahmed', 'Brown', 'Mensah', 'Weber', 'Tanaka', 'Cohen', 'Adeyemi', 'Martin', 'Boateng', 'Novak', 'Singh']
const SOURCES: [string, number][] = [['Gmail', 0.72], ['Web form', 0.18], ['Survey', 0.1]]

export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pickWeighted<T>(rand: () => number, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rand() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

function scoreFor(rand: () => number, sentiment: Sentiment, severity: Severity) {
  if (sentiment === 'positive') return +(0.45 + rand() * 0.5).toFixed(2)
  if (sentiment === 'neutral') return +(-0.15 + rand() * 0.3).toFixed(2)
  const base = severity === 'critical' ? -0.85 : severity === 'high' ? -0.7 : -0.5
  return +Math.max(-1, base - rand() * 0.25).toFixed(2)
}

function statusFor(rand: () => number, daysAgo: number): FeedbackStatus {
  if (daysAgo < 3) return rand() < 0.8 ? 'new' : 'in_review'
  if (daysAgo < 14) return pickWeighted(rand, ['new', 'in_review', 'actioned', 'resolved'] as FeedbackStatus[], [2, 3, 2, 2])
  return pickWeighted(rand, ['in_review', 'actioned', 'resolved'] as FeedbackStatus[], [1, 2, 6])
}

export function generateDemoFeedback(now = new Date(), days = 120, seed = 777): FeedbackRecord[] {
  const rand = mulberry32(seed)
  const records: FeedbackRecord[] = []
  let seq = 1000
  for (let d = days - 1; d >= 0; d--) {
    // volume grows gently over time with weekday seasonality
    const date = new Date(now)
    date.setDate(date.getDate() - d)
    const weekend = date.getDay() === 0 || date.getDay() === 6
    const volume = Math.round((weekend ? 1.4 : 2.6) + (days - d) / 45 + rand() * 2.2)
    const weights = TEMPLATES.map((t) => t.weight(d))
    for (let i = 0; i < volume; i++) {
      const t = pickWeighted(rand, TEMPLATES, weights)
      const received = new Date(date)
      received.setHours(7 + Math.floor(rand() * 14), Math.floor(rand() * 60), Math.floor(rand() * 60), 0)
      if (received > now) received.setTime(now.getTime() - Math.floor(rand() * 3_600_000))
      const first = FIRST[Math.floor(rand() * FIRST.length)]
      const last = LAST[Math.floor(rand() * LAST.length)]
      const hasCustomer = rand() > 0.08
      const created = new Date(received.getTime() + 30_000 + Math.floor(rand() * 240_000))
      records.push({
        id: `FB-${++seq}`,
        original_message: t.messages[Math.floor(rand() * t.messages.length)],
        subject: t.subjects[Math.floor(rand() * t.subjects.length)],
        source: pickWeighted(rand, SOURCES.map((s) => s[0]), SOURCES.map((s) => s[1])),
        received_at: received.toISOString(),
        customer_name: hasCustomer ? `${first} ${last}` : null,
        customer_email: hasCustomer ? `${first}.${last}@example.com`.toLowerCase() : null,
        sentiment: t.sentiment,
        sentiment_score: scoreFor(rand, t.sentiment, t.severity),
        category: t.category,
        theme: t.theme,
        issue: t.issue,
        severity: t.severity,
        ai_summary: t.summary,
        status: statusFor(rand, d),
        created_at: (created > now ? now : created).toISOString(),
      })
    }
  }
  return records.sort((a, b) => b.received_at.localeCompare(a.received_at))
}

let incomingSeq = 9000

/** One freshly "processed" email, used by the demo-mode pipeline simulator. */
export function makeIncomingDemo(now = new Date()): FeedbackRecord {
  const rand = mulberry32(Date.now() % 100000)
  // Bias towards the planted emerging issue so the demo visibly moves metrics.
  const t = rand() < 0.5 ? TEMPLATES[0] : TEMPLATES[Math.floor(rand() * TEMPLATES.length)]
  const first = FIRST[Math.floor(rand() * FIRST.length)]
  const last = LAST[Math.floor(rand() * LAST.length)]
  return {
    id: `FB-${++incomingSeq}`,
    original_message: t.messages[Math.floor(rand() * t.messages.length)],
    subject: t.subjects[Math.floor(rand() * t.subjects.length)],
    source: 'Gmail',
    received_at: new Date(now.getTime() - 90_000).toISOString(),
    customer_name: `${first} ${last}`,
    customer_email: `${first}.${last}@example.com`.toLowerCase(),
    sentiment: t.sentiment,
    sentiment_score: scoreFor(rand, t.sentiment, t.severity),
    category: t.category,
    theme: t.theme,
    issue: t.issue,
    severity: t.severity,
    ai_summary: t.summary,
    status: 'new',
    created_at: now.toISOString(),
  }
}
