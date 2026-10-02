# n8n workflow: Sentra Feedback Pipeline

Lives in n8n as **Sentra Feedback Pipeline**. These files are reference copies of its custom parts.

```
Gmail Trigger → Extract Email Fields → Analyze with Gemini → Build Sentra Row → Save to Sentra Sheet → Mark Email as Processed
```

| Node | What it does |
|---|---|
| Gmail Trigger | Every minute, picks up **unread** emails with the Gmail label **Feedback** (`label:feedback`) |
| Extract Email Fields | Gmail id, sender name and email, subject, plain-text body (max 6,000 chars), received date |
| Analyze with Gemini | `gemini-2.5-flash`, JSON output, prompt in [`gemini-system-prompt.txt`](gemini-system-prompt.txt). Retries 3 times; on failure the email continues so it isn't lost |
| Build Sentra Row | [`build-sentra-row.js`](build-sentra-row.js): validates the AI answer and produces the 17 sheet columns. If the AI failed, the row is saved as *Unclassified* |
| Save to Sentra Sheet | Append or update on `id` (the Gmail message id) in the `feedback` tab, so re-runs never duplicate rows. `RAW` format so text isn't interpreted as formulas |
| Mark Email as Processed | Marks the email read, so the trigger never picks it up again |

To change the prompt or the code, edit them in n8n and copy them back here.
