# Minimalist Disposable Email Service

A simple, receive-only disposable email service similar to YOPmail.

## Architecture

```
[ Email Sender ] --(SMTP:2525)--> [ Node.js SMTP Server ]
                                          |
                                     (Parse & Save)
                                          v
                                    [  Database  ]
                                          ^
                                     (Query)
                                          |
[ Web Client ] ---(HTTP:5000)---> [ Express API ]
```

**Components:**
1. **SMTP Server**: Listens on port 2525 (mapped to 25 in prod). Accepts all emails.
2. **Express API**: Serves the frontend and provides endpoints to list/read emails.
3. **Storage**: SQLite database storing emails for 7 days.
4. **Cleanup Job**: Runs hourly to remove old emails.
5. **Frontend**: React-based minimal UI.

## Features

- **Disposable Inboxes**: Access any inbox by name (e.g. `anything@yourdomain.com`).
- **Receive-Only**: No outbound email support (prevents abuse).
- **Auto-Cleanup**: Emails auto-deleted after 7 days.
- **No Auth**: Completely public and open.

## Setup Instructions

### 1. Development (Replit)
The project is pre-configured.
1. Run `npm install` (handled automatically).
2. Run `npm run dev` to start the server.
3. The Web UI runs on port 5000.
4. The SMTP server runs on port 2525. 
   - *Note*: To test receiving emails, you can use `telnet localhost 2525` or a tool like `swaks`.

### 2. Production (VPS)
1. Clone the repository.
2. Set `DATABASE_URL` env var.
3. Build the frontend: `npm run build`.
4. Start the server: `npm start`.
5. **Port Forwarding**: SMTP uses port 25 by default. You must forward port 25 to 2525 using iptables or a proxy (like Nginx/HAProxy) because Node.js shouldn't run as root.
   ```bash
   sudo iptables -t nat -A PREROUTING -p tcp --dport 25 -j REDIRECT --to-port 2525
   ```
6. **DNS**: Configure an MX record for your domain pointing to this server.

## Security & Abuse
- **Rate Limiting**: Not implemented in this minimal version, but recommended for production.
- **Spam Filtering**: Currently accepts everything. In production, consider adding SPF/DKIM checks in `server/smtp.ts`.
- **No Attachments**: The current implementation parses text/html but doesn't store attachments to save space.
