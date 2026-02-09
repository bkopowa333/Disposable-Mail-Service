# VPS SMTP Setup for tweak.gay

A lightweight, standalone SMTP receiver. Drop it on any cheap VPS
and it writes incoming mail straight to your shared PostgreSQL database.

---

## Prerequisites

- A VPS running Ubuntu/Debian (DigitalOcean, Vultr, Hetzner, etc. — $4-6/mo is fine)
- Node.js 18+ installed on the VPS
- Your PostgreSQL DATABASE_URL (from your Replit project or any hosted Postgres)
- **Important**: Your PostgreSQL database must be accessible from the VPS.
  If using Replit's built-in database, you may need an externally accessible
  Postgres instead (e.g., Neon, Supabase, or a self-hosted one on the VPS).

---

## 0. Port 25 — Check Your VPS Provider First

Many VPS providers (AWS, GCP, Azure, Oracle Cloud) **block inbound port 25
by default** to prevent spam. Before proceeding, check if your provider
requires you to request port 25 access:

| Provider       | Port 25 Status                                      |
|----------------|-----------------------------------------------------|
| DigitalOcean   | Open by default on new accounts                     |
| Vultr          | Open by default                                     |
| Hetzner        | Open by default                                     |
| Linode/Akamai  | Open by default                                     |
| AWS EC2        | Blocked — must request removal via support ticket    |
| GCP            | Blocked — use a relay or Mailgun/SendGrid instead    |
| Azure          | Blocked — must request via support                   |
| Oracle Cloud   | Blocked — must open in security list                 |

If your provider blocks port 25, either:
1. Submit a support request to unblock it, or
2. Choose a provider that allows it (DigitalOcean/Vultr/Hetzner recommended)

---

## 1. DNS Records

At your domain registrar, add these records:

| Type | Host   | Value              | Priority |
|------|--------|--------------------|----------|
| MX   | @      | mail.tweak.gay     | 10       |
| A    | mail   | <YOUR_VPS_IP>      |          |

Replace `<YOUR_VPS_IP>` with the public IP of your VPS.

Wait for DNS propagation (usually 5-30 minutes, can take up to 48 hours).

---

## 2. VPS Setup

SSH into your VPS:

```bash
ssh root@<YOUR_VPS_IP>
```

### Install Node.js (if not already installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Copy the files

```bash
mkdir -p /opt/smtp-receiver
cd /opt/smtp-receiver
```

Copy these three files to `/opt/smtp-receiver/`:
- `package.json`
- `smtp.js`

Or clone your repo and use only the `vps-smtp/` folder.

### Install dependencies

```bash
cd /opt/smtp-receiver
npm install
```

### Create the database table

The SMTP receiver writes to an `emails` table. You need to create it
before running the script. Run this SQL against your database:

```bash
psql "postgresql://user:password@host:5432/dbname" -c "
CREATE TABLE IF NOT EXISTS emails (
  id SERIAL PRIMARY KEY,
  inbox TEXT NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_emails_inbox ON emails (inbox);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails (received_at);
"
```

If you're sharing the database with the Replit app and have already
run `npm run db:push` there, the table already exists and you can skip this.

---

## 3. Port Forwarding

SMTP traffic arrives on port 25, but our app listens on port 2525
(to avoid running as root). Redirect port 25 → 2525:

```bash
sudo iptables -t nat -A PREROUTING -p tcp --dport 25 -j REDIRECT --to-port 2525

# Make it persist across reboots
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

### Open the firewall

```bash
sudo ufw allow 25/tcp
sudo ufw enable
```

---

## 4. Run the SMTP Server

### Quick test

```bash
DATABASE_URL="postgresql://user:password@host:5432/dbname" node smtp.js
```

You should see:
```
Database connected.
SMTP server listening on port 2525
Accepting mail for *@tweak.gay
```

### Run permanently with pm2

```bash
sudo npm install -g pm2

DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  pm2 start smtp.js --name "smtp-receiver"

pm2 save
pm2 startup   # follow the printed command to enable auto-start on boot
```

---

## 5. Test It

From any machine with `swaks` installed:

```bash
# Install swaks (if needed)
sudo apt install swaks    # Debian/Ubuntu
brew install swaks        # macOS

# Send a test email
swaks \
  --to test@tweak.gay \
  --from sender@example.com \
  --server mail.tweak.gay:25 \
  --header "Subject: Hello from VPS" \
  --body "This is a test email!"
```

Then open your web UI and check the `test` inbox.

---

## 6. Environment Variables

| Variable       | Default      | Description                        |
|----------------|--------------|------------------------------------|
| `DATABASE_URL` | *(required)* | PostgreSQL connection string       |
| `SMTP_PORT`    | `2525`       | Port the SMTP server listens on    |
| `DOMAIN`       | `tweak.gay`  | Domain to accept email for         |

---

## 7. Logs

View live logs:
```bash
pm2 logs smtp-receiver
```

Each received email is logged as:
```
[2026-02-09T20:30:00.000Z] Stored: sender@example.com → test@tweak.gay | "Hello from VPS"
```

---

## 8. Security Notes

- **No outbound email**: This server only receives, it never sends.
- **No authentication**: Inboxes are public by design (like YOPmail).
- **Rate limiting**: Not included. For production, consider adding
  connection rate limits via `iptables` or a reverse proxy.
- **TLS**: For production SMTP TLS, generate a certificate with
  Let's Encrypt and pass `key`/`cert` options to SMTPServer.

---

## 9. Architecture

```
Internet                          VPS                         Database
────────                    ─────────────                  ──────────────
                            ┌─────────────┐
sender@example.com ──SMTP──►│  Port 25    │
                            │  (iptables) │
                            │      │      │
                            │      ▼      │
                            │  Port 2525  │               ┌──────────────┐
                            │  smtp.js    │──── INSERT ──►│  PostgreSQL  │
                            └─────────────┘               │  (shared DB) │
                                                          └──────┬───────┘
                                                                 │
                            ┌─────────────┐                      │
        Web browser ──HTTP──►│ Replit App  │──── SELECT ─────────┘
                            │ (port 5000) │
                            └─────────────┘
```

The VPS handles SMTP only. The Replit app handles the web UI.
Both read/write the same PostgreSQL database.
