import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { startSmtpServer } from "./smtp";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Start SMTP Server
  // We use port 2525 because 25 is likely privileged/blocked
  try {
    startSmtpServer(2525);
  } catch (err) {
    console.error("Failed to start SMTP server:", err);
  }

  // Cleanup Job: Delete emails older than 7 days every hour
  const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  setInterval(async () => {
    try {
      const deleted = await storage.deleteOldEmails(7);
      if (deleted > 0) {
        console.log(`Cleanup: Deleted ${deleted} expired emails`);
      }
    } catch (err) {
      console.error("Cleanup job failed:", err);
    }
  }, CLEANUP_INTERVAL);

  // Seed Data: Add a welcome email if "demo" inbox is empty
  try {
    const demoEmails = await storage.getEmailsForInbox('demo');
    if (demoEmails.length === 0) {
      await storage.createEmail({
        inbox: 'demo',
        sender: 'system@yopclone.com',
        subject: 'Welcome to your disposable inbox',
        bodyText: 'This is a test email. Your inbox is ready to receive messages.',
        bodyHtml: '<p>This is a <strong>test email</strong>. Your inbox is ready to receive messages.</p>',
      });
      console.log('Seeded "demo" inbox with welcome email');
    }
  } catch (err) {
    console.error("Error seeding data:", err);
  }


  // API Routes
  app.get(api.inboxes.listEmails.path, async (req, res) => {
    const { inbox } = req.params;
    const emails = await storage.getEmailsForInbox(inbox.toLowerCase());
    res.json(emails);
  });

  app.get(api.inboxes.getEmail.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const email = await storage.getEmail(id);
    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }
    res.json(email);
  });

  return httpServer;
}
