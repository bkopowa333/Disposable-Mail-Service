#!/usr/bin/env node

/**
 * Standalone SMTP Receiver for tweak.gay
 *
 * Accepts incoming email for *@tweak.gay and writes it
 * directly to the shared PostgreSQL database.
 *
 * Usage:
 *   DATABASE_URL="postgresql://user:pass@host:5432/dbname" node smtp.js
 *
 * Environment variables:
 *   DATABASE_URL  — PostgreSQL connection string (required)
 *   SMTP_PORT     — Port to listen on (default: 2525)
 *   DOMAIN        — Accepted email domain (default: tweak.gay)
 */

const { SMTPServer } = require("smtp-server");
const { simpleParser } = require("mailparser");
const { Pool } = require("pg");

// ── Config ──────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "2525", 10);
const DOMAIN = process.env.DOMAIN || "tweak.gay";

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  console.error("Example: DATABASE_URL='postgresql://user:pass@host:5432/db' node smtp.js");
  process.exit(1);
}

// ── Database ────────────────────────────────────────────
const pool = new Pool({ connectionString: DATABASE_URL });

async function storeEmail({ inbox, sender, subject, bodyText, bodyHtml }) {
  const query = `
    INSERT INTO emails (inbox, sender, subject, body_text, body_html, received_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
  `;
  await pool.query(query, [inbox, sender, subject, bodyText, bodyHtml]);
}

// ── SMTP Server ─────────────────────────────────────────
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
            `[${new Date().toISOString()}] Stored: ${sender} → ${inbox}@${DOMAIN} | "${parsed.subject || "(No Subject)"}"`
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

// ── Startup ─────────────────────────────────────────────
(async () => {
  // Verify database connection
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

// ── Graceful shutdown ───────────────────────────────────
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
