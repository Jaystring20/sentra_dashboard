# Sentra demo feedback emails

Send each email **to `jaydigitalstrategist+feedback@gmail.com`** from accounts other than jaydigitalstrategist@gmail.com: your phone, friends', teammates', or a few free Gmail accounts. Different senders make the "Customer" column and the customer list look realistic.

The business is a fictional online store that sells home electronics and delivers them, with a website, a mobile app and a support team. That gives Gemini all 8 themes to work with.

## How to send them

To get a real **trend over time** (rising issues, emerging trends, alerts), spread the emails across **3 days** instead of sending them all at once:

| When | Send | What it sets up on the dashboard |
|---|---|---|
| **Day 1** | Emails 1–10 | A healthy baseline: mostly praise, a few small problems |
| **Day 2** | Emails 11–18 | Support complaints start, plus the first billing problem |
| **Day 3** | Emails 19–26 | Support complaints spike and the billing problem repeats, producing an **emerging trend**, a **risk signal** and **alerts** |
| **During the presentation** | Email 27 | The live demo email |

Short on time? Send them all on one day, about a minute apart. Themes, issues, sentiment and insights still work; only the "over time" charts look flatter.

> n8n picks up to 10 new emails each minute, so a batch of 8–10 is analyzed within 1–2 minutes.

---

## Day 1: baseline (mostly positive)

**1**
Subject: **Fantastic headphones**
> I received my noise-cancelling headphones yesterday and they are brilliant. The sound quality is far better than I expected for the price. Very happy with this purchase.

**2**
Subject: **Delivery was super quick**
> Ordered on Monday evening and the package arrived Tuesday morning. Well packed too. Great service, I'll definitely order again.

**3**
Subject: **Thank you to Grace at the pickup point**
> I want to say thank you to Grace at your Lekki pickup point. She was patient, explained how to set up my router and even helped me carry the box to my car. Excellent staff.

**4**
Subject: **Question about warranty**
> Hello, does the 12-month warranty on the smart TV also cover the remote control? And do I need to register the product somewhere? Thanks.

**5**
Subject: **Love the new website**
> The new website is so much easier to use. I found what I needed in seconds and checkout took less than a minute. Nice work.

**6**
Subject: **Blender quality**
> I've used the blender every day for three weeks now and it still works perfectly. It feels solid and well made. Recommended it to my sister already.

**7**
Subject: **Suggestion for the app**
> It would be great if the mobile app had a dark mode and showed the delivery driver's location on a map. Otherwise the app is fine.

**8**
Subject: **Order arrived a day late**
> My order was supposed to arrive on Thursday but came on Friday. Not a huge problem but I had planned around it. Please keep delivery estimates accurate.

**9**
Subject: **Friendly customer service**
> I called about changing my delivery address and the agent sorted it out in two minutes. Polite and helpful. Thank you.

**10**
Subject: **Return policy**
> Can I exchange a phone case for a different colour, or do I need to return it and place a new order? What is the return window?

---

## Day 2: problems start to appear

**11**
Subject: **No reply to my support ticket**
> I opened a support ticket three days ago about a faulty charger and I still haven't heard anything back. Can someone please respond?

**12**
Subject: **Charged twice for one order**
> My bank statement shows two identical charges for my order last week, but I only placed one order. Please refund the duplicate payment as soon as possible.

**13**
Subject: **App keeps crashing**
> Since the latest update, the app crashes every time I try to log in on my Android phone. I've reinstalled it twice and it still happens.

**14**
Subject: **Still waiting for support**
> I emailed your support team twice about my missing accessories and nobody has replied. It's been four days. This is frustrating.

**15**
Subject: **Great value for money**
> Bought the 43-inch TV during your sale. The picture quality is excellent and the price was unbeatable. Very satisfied.

**16**
Subject: **Box arrived damaged**
> The box was crushed when it arrived and the screen protector inside was cracked. I'd like a replacement please.

**17**
Subject: **Refund taking too long**
> I returned a speaker two weeks ago and the refund still hasn't reached my account. Can you tell me what is happening?

**18**
Subject: **Helpful staff in store**
> The staff at your Ikeja store were incredibly helpful. They compared three laptops with me and helped me choose the right one. Great experience.

---

## Day 3: the spike (support and billing)

**19**
Subject: **Support is ignoring me**
> This is my third email this week. Nobody from customer support has responded about my broken blender. If I don't hear back soon I will request a full refund and stop shopping with you.

**20**
Subject: **Double charge again**
> I was charged twice for the same order after updating my card details. This is the second time this has happened. I need this fixed urgently, it has left my account overdrawn.

**21**
Subject: **Waited a week for a reply**
> It took over a week for anyone from your support team to reply to my email. By then I had already solved the problem myself. Response times have really gotten worse.

**22**
Subject: **Can't log in to the app**
> The app freezes on the login screen and then closes. I can't track my order at all. Please fix this.

**23**
Subject: **Support response time**
> I've noticed your support used to reply within a day, but now it takes several days. I've been waiting since Monday for an answer about my order.

**24**
Subject: **Payment error at checkout**
> I keep getting a payment error at checkout on the website even though my card works everywhere else. I've tried three times today.

**25**
Subject: **Excellent product quality**
> The wireless earbuds are amazing. Great battery life, comfortable fit and very clear calls. Worth every naira.

**26**
Subject: **Late delivery for a gift**
> I paid for express delivery so a gift would arrive before my friend's birthday. It arrived two days late. Very disappointing.

---

## During the presentation: the live demo email

**27**
Subject: **Nobody is answering**
> I contacted your support team five days ago about a faulty phone charger and I still have no reply. I've also emailed twice since. This is really poor service and I'm considering taking my business elsewhere.

**What to show after sending it:**
1. **Gmail**: it arrives with the **Feedback** label.
2. **n8n**: the run appears under **Executions**, with each step green. Open "Analyze with Gemini" to show the AI's JSON answer.
3. **Google Sheet**: the new row in the `feedback` tab.
4. **Sentra Overview**: it appears in **Recent customer voice** marked "Just arrived", and the totals update.
5. **AI Insights**: open **"Slow support response time" is becoming more frequent**, then **View supporting feedback**. Your live email is in the list, and clicking it opens the original message and the AI analysis.

---

## What Gemini should roughly produce

| Theme | Emails | Expected pattern |
|---|---|---|
| Customer Support | 9, 11, 14, 19, 21, 23, 27 | **Recurring problem + emerging trend** ("Slow support response time"), mostly negative, high severity |
| Pricing & Billing | 12, 20 | **Risk signal**: duplicate charge, critical severity |
| Mobile App | 7, 13, 22 | App crashes on login (high), plus one suggestion |
| Delivery | 2, 8, 16, 26 | Mixed: praise, late delivery, damaged package |
| Staff & Service | 3, 18 | **Positive signal** |
| Product Quality | 1, 6, 15, 25 | **Positive signal** |
| Returns & Refunds | 10, 17 | Question + refund delay |
| Website & Checkout | 5, 24 | Praise + payment error |

Gemini decides the final labels, so they may differ a little. That's expected and shows the AI is really analyzing each email.
