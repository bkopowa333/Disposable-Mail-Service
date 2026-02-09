import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  inbox: text("inbox").notNull(), // The local-part of the email (e.g., 'tom' in tom@domain.com)
  sender: text("sender").notNull(),
  subject: text("subject"),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});

export const insertEmailSchema = createInsertSchema(emails).omit({ 
  id: true, 
  receivedAt: true 
});

export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;

// API Types
export type EmailResponse = Email;
export type EmailListResponse = Email[];
