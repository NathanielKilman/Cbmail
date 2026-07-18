# CBMail

Internal Gmail-style inbox for cybearbots.org subdomains (business/mechanical/code/general), deployed as a Cloudflare Pages site with Pages Functions handling the backend.

## Setup

1. `npm install`
2. Create a D1 database (or reuse the existing one from the old worker) and put its ID in `wrangler.toml`
3. In Cloudflare Pages → Settings → Environment variables, add:
   - `RESEND_API_KEY`
   - `RESEND_WEBHOOK_SECRET`
4. In Cloudflare Pages → Settings → Functions → D1 database bindings, bind `DB` to the same database
5. Run the schema below against that D1 database
6. In Resend → Webhooks, point the inbound webhook at `https://cbmail.cybearbots.org/api/webhook`
7. Connect this repo to a Cloudflare Pages project (build command `npm run build`, output dir `dist`)

## D1 schema

```sql
CREATE TABLE emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inbox TEXT,
  from_address TEXT,
  to_address TEXT,
  subject TEXT,
  body TEXT,
  html_body TEXT,
  message_id TEXT,
  raw_headers TEXT,
  received_at TEXT,
  is_read INTEGER DEFAULT 0
);
```

## API

- `GET /api/emails?inbox=business` — list emails in an inbox
- `GET /api/emails?id=123` — get a single email
- `PATCH /api/emails` — `{ id, is_read }` — mark read/unread
- `POST /api/send` — `{ from, to, subject, body, replyToEmailId? }` — send or reply
- `POST /api/webhook` — Resend inbound webhook target 

## Status

Backend wiring is functional. Frontend (`src/App.jsx`) is a bare stub for testing the API — the real inbox UI/design is a separate pass.  
