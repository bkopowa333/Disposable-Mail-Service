#!/bin/bash
#
# One-command setup for tweak.gay SMTP receiver
#
# Usage:
#   DATABASE_URL="postgresql://user:pass@host:5432/db" bash install.sh
#
# Optional env vars:
#   DOMAIN     — email domain to accept (default: tweak.gay)
#   SMTP_PORT  — port the SMTP app listens on (default: 2525)
#
# This script will:
#   1. Check you're running as root
#   2. Install Node.js 20 (if not present)
#   3. Create the app directory and files
#   4. Install npm dependencies
#   5. Create the emails table in your database
#   6. Set up port 25 → 2525 forwarding
#   7. Open firewall port 25
#   8. Start the SMTP server with pm2 (auto-restarts on crash/reboot)
#

set -e

# ─── Colors ──────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[!!]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

# ─── Check root ──────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
  fail "This script must be run as root. Try: sudo bash install.sh"
fi

# ─── Check DATABASE_URL ─────────────────────────────────
if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "=================================================="
  echo "  DATABASE_URL is required"
  echo "=================================================="
  echo ""
  echo "  Run this script like:"
  echo ""
  echo '  DATABASE_URL="postgresql://user:pass@host:5432/db" bash install.sh'
  echo ""
  exit 1
fi

ok "DATABASE_URL is set"

# ─── 1. Install Node.js ─────────────────────────────────
echo ""
echo "── Step 1: Node.js ──────────────────────────────────"

if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  ok "Node.js already installed ($NODE_VERSION)"
else
  warn "Node.js not found, installing v20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  ok "Node.js $(node --version) installed"
fi

# ─── 2. Create app directory & files ─────────────────────
echo ""
echo "── Step 2: App files ────────────────────────────────"

APP_DIR="/opt/smtp-receiver"
mkdir -p "$APP_DIR"

# Write package.json
cat > "$APP_DIR/package.json" << 'PKGJSON'
{
  "name": "tweak-gay-smtp-receiver",
  "version": "1.0.0",
  "description": "Standalone SMTP receiver for tweak.gay disposable email service",
  "main": "smtp.js",
  "scripts": {
    "start": "node smtp.js"
  },
  "dependencies": {
    "mailparser": "^3.7.2",
    "pg": "^8.13.1",
    "smtp-server": "^3.13.6"
  }
}
PKGJSON

# Write smtp.js
cat > "$APP_DIR/smtp.js" << 'SMTPJS'
#!/usr/bin/env node

const { SMTPServer } = require("smtp-server");
const { simpleParser } = require("mailparser");
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "2525", 10);
const DOMAIN = process.env.DOMAIN || "tweak.gay";

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function storeEmail({ inbox, sender, subject, bodyText, bodyHtml }) {
  const query = `
    INSERT INTO emails (inbox, sender, subject, body_text, body_html, received_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
  `;
  await pool.query(query, [inbox, sender, subject, bodyText, bodyHtml]);
}

const server = new SMTPServer({
  authOptional: true,
  disabledCommands: ["AUTH"],
  banner: `${DOMAIN} Disposable Email Service`,

  onRcptTo(address, session, callback) {
    if (address.address.toLowerCase().endsWith(`@${DOMAIN}`)) {
      return callback();
    }
    return callback(new Error(`Only @${DOMAIN} addresses are accepted`));
  },

  onData(stream, session, callback) {
    simpleParser(stream, async (err, parsed) => {
      if (err) {
        console.error("Parse error:", err.message);
        return callback(new Error("Failed to parse message"));
      }
      try {
        const recipients = session.envelope.rcptTo;
        const sender = session.envelope.mailFrom
          ? session.envelope.mailFrom.address
          : "unknown";
        for (const recipient of recipients) {
          const inbox = recipient.address.split("@")[0].toLowerCase();
          if (!inbox) continue;
          await storeEmail({
            inbox,
            sender,
            subject: parsed.subject || "(No Subject)",
            bodyText: parsed.text || "",
            bodyHtml: typeof parsed.html === "string" ? parsed.html : "",
          });
          console.log(
            `[${new Date().toISOString()}] Stored: ${sender} -> ${inbox}@${DOMAIN} | "${parsed.subject || "(No Subject)"}"`
          );
        }
        return callback();
      } catch (storageErr) {
        console.error("Storage error:", storageErr.message);
        return callback(new Error("Internal error"));
      }
    });
  },
});

server.on("error", (err) => {
  console.error("SMTP error:", err.message);
});

(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("Database connected.");
  } catch (err) {
    console.error("Cannot connect to database:", err.message);
    process.exit(1);
  }
  server.listen(SMTP_PORT, () => {
    console.log(`SMTP server listening on port ${SMTP_PORT}`);
    console.log(`Accepting mail for *@${DOMAIN}`);
  });
})();

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
function shutdown() {
  console.log("\nShutting down...");
  server.close(() => {
    pool.end(() => {
      console.log("Bye.");
      process.exit(0);
    });
  });
}
SMTPJS

ok "Files written to $APP_DIR"

# ─── 3. Install npm dependencies ────────────────────────
echo ""
echo "── Step 3: npm install ──────────────────────────────"

cd "$APP_DIR"
npm install --production
ok "Dependencies installed"

# ─── 4. Create database table ────────────────────────────
echo ""
echo "── Step 4: Database table ───────────────────────────"

# Use node to run the SQL (avoids needing psql installed)
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    await pool.query(\`
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
    \`);
    console.log('Table ready.');
    await pool.end();
  } catch (err) {
    console.error('DB error:', err.message);
    process.exit(1);
  }
})();
"
ok "emails table created (or already exists)"

# ─── 5. Port forwarding (25 → 2525) ─────────────────────
echo ""
echo "── Step 5: Port forwarding ──────────────────────────"

# Check if rule already exists
if iptables -t nat -C PREROUTING -p tcp --dport 25 -j REDIRECT --to-port 2525 2>/dev/null; then
  ok "iptables rule already exists (25 → 2525)"
else
  iptables -t nat -A PREROUTING -p tcp --dport 25 -j REDIRECT --to-port 2525
  ok "Added iptables rule: port 25 → 2525"
fi

# Persist across reboots
if command -v netfilter-persistent &> /dev/null; then
  netfilter-persistent save 2>/dev/null
  ok "iptables rules saved"
else
  warn "iptables-persistent not found, installing..."
  DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
  netfilter-persistent save 2>/dev/null
  ok "iptables rules saved"
fi

# ─── 6. Firewall ────────────────────────────────────────
echo ""
echo "── Step 6: Firewall ─────────────────────────────────"

if command -v ufw &> /dev/null; then
  ufw allow 25/tcp 2>/dev/null || true
  ok "UFW: port 25 allowed"
else
  warn "ufw not found — make sure port 25 is open in your VPS firewall/security group"
fi

# ─── 7. Start with pm2 ──────────────────────────────────
echo ""
echo "── Step 7: Start SMTP server ────────────────────────"

# Install pm2 if needed
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
  ok "pm2 installed"
fi

# Stop old instance if running
pm2 delete smtp-receiver 2>/dev/null || true

# Create a pm2 ecosystem config so DATABASE_URL persists across restarts/reboots
cat > "$APP_DIR/ecosystem.config.js" << ECOJS
module.exports = {
  apps: [{
    name: "smtp-receiver",
    script: "$APP_DIR/smtp.js",
    env: {
      DATABASE_URL: "$DATABASE_URL",
      SMTP_PORT: "${SMTP_PORT:-2525}",
      DOMAIN: "${DOMAIN:-tweak.gay}"
    }
  }]
};
ECOJS

# Start using ecosystem config
pm2 start "$APP_DIR/ecosystem.config.js"

pm2 save
pm2 startup 2>/dev/null || true
ok "SMTP server running via pm2 (env vars persisted in ecosystem.config.js)"

# ─── Done ────────────────────────────────────────────────
DOMAIN="${DOMAIN:-tweak.gay}"
echo ""
echo "=================================================="
echo -e "  ${GREEN}Setup complete!${NC}"
echo "=================================================="
echo ""
echo "  SMTP server is running and accepting mail for *@${DOMAIN}"
echo ""
echo "  Useful commands:"
echo "    pm2 logs smtp-receiver    — View live logs"
echo "    pm2 status                — Check if running"
echo "    pm2 restart smtp-receiver — Restart the server"
echo ""
echo "  Test it from another machine:"
echo '    swaks --to test@tweak.gay --from you@example.com --server mail.tweak.gay:25 --body "Hello!"'
echo ""
echo "  Don't forget DNS records at your registrar:"
echo "    MX  @     → mail.tweak.gay (priority 10)"
echo "    A   mail  → $(curl -s ifconfig.me || echo '<this server IP>')"
echo ""
