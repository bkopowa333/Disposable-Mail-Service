# Minimalist Disposable Email Service

## Overview

This is a receive-only disposable email service (similar to YOPmail/Guerrilla Mail) for the domain `tweak.gay`. Users can access any inbox by name without authentication — just type a name and see emails sent to `<name>@tweak.gay`. The system has two main server components: an SMTP server that accepts incoming emails and an Express HTTP API that serves a React frontend for reading them. Emails auto-delete after 7 days.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router) with two main routes: `/` (home/landing) and `/inbox/:name` (inbox viewer)
- **UI Components**: shadcn/ui component library built on Radix UI primitives with Tailwind CSS
- **State Management**: TanStack React Query for server state, with 10-second polling interval for new emails
- **Styling**: Tailwind CSS with CSS custom properties for theming. Fonts: Manrope (sans), Outfit (display), JetBrains Mono (mono)
- **Security**: DOMPurify sanitizes HTML email content before rendering to prevent XSS

### Backend
- **Runtime**: Node.js with TypeScript (via tsx in dev, esbuild for production)
- **HTTP Server**: Express.js serving both the API and the static frontend
- **SMTP Server**: `smtp-server` npm package listening on port 2525 (mapped to 25 in production via iptables). Accepts emails only for `@tweak.gay` domain, parses them with `mailparser`, and stores them in the database
- **API Endpoints**:
  - `GET /api/inboxes/:inbox/emails` — List all emails for an inbox
  - `GET /api/emails/:id` — Get a single email by ID
- **Shared Route Definitions**: The `shared/routes.ts` file defines API contracts with Zod schemas, used by both client and server
- **Cleanup Job**: A `setInterval` running hourly deletes emails older than 7 days
- **Seed Data**: On startup, a welcome email is seeded into the "demo" inbox if it's empty

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: `node-postgres` (pg) Pool, configured via `DATABASE_URL` environment variable
- **Schema** (in `shared/schema.ts`): Single `emails` table with columns:
  - `id` (serial, primary key)
  - `inbox` (text, the local-part of the email address)
  - `sender` (text)
  - `subject` (text, nullable)
  - `body_text` (text, nullable)
  - `body_html` (text, nullable)
  - `received_at` (timestamp, defaults to now)
- **Migrations**: Managed via `drizzle-kit push` (schema push approach, not migration files)

### VPS SMTP Component
- There's a standalone SMTP receiver in `vps-smtp/` designed to run on a separate VPS. It's a plain Node.js script (no TypeScript) that connects to the same PostgreSQL database and writes emails directly. This exists because Replit can't receive SMTP traffic on port 25, so production email receiving happens on an external VPS.

### Key Design Decisions
1. **Receive-only**: No outbound email to prevent abuse. The SMTP server only accepts incoming mail.
2. **No authentication**: Inboxes are completely public — anyone can view any inbox by name. This is intentional for a disposable email service.
3. **Shared schema**: The `shared/` directory contains database schema and API route definitions used by both frontend and backend, ensuring type safety across the stack.
4. **Port 2525 for SMTP**: Node.js runs as non-root, so port 25 is redirected to 2525 via iptables in production.

## External Dependencies

- **PostgreSQL**: Required. Connection string provided via `DATABASE_URL` environment variable. The Drizzle config and storage layer are built for Postgres.
- **SMTP (inbound)**: The built-in SMTP server on port 2525 accepts mail for `@tweak.gay`. In production, a VPS with port 25 access is needed (see `vps-smtp/` directory).
- **DNS**: MX record pointing to `mail.tweak.gay` and an A record for `mail` subdomain pointing to the VPS IP.
- **No external email services**: No SendGrid, Mailgun, etc. — the app runs its own SMTP server.
- **No authentication providers**: No OAuth, no session management beyond basic Express setup.
- **Google Fonts**: Manrope, Outfit, JetBrains Mono loaded from Google Fonts CDN.