import { db } from "./db";
import { emails, type InsertEmail, type Email } from "@shared/schema";
import { eq, desc, lt, sql } from "drizzle-orm";

export interface IStorage {
  // Email operations
  createEmail(email: InsertEmail): Promise<Email>;
  getEmailsForInbox(inbox: string): Promise<Email[]>;
  getEmail(id: number): Promise<Email | undefined>;
  deleteOldEmails(ageInDays: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const [email] = await db
      .insert(emails)
      .values(insertEmail)
      .returning();
    return email;
  }

  async getEmailsForInbox(inbox: string): Promise<Email[]> {
    return await db
      .select()
      .from(emails)
      .where(eq(emails.inbox, inbox))
      .orderBy(desc(emails.receivedAt));
  }

  async getEmail(id: number): Promise<Email | undefined> {
    const [email] = await db
      .select()
      .from(emails)
      .where(eq(emails.id, id));
    return email;
  }

  async deleteOldEmails(ageInDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageInDays);

    const result = await db
      .delete(emails)
      .where(lt(emails.receivedAt, cutoffDate))
      .returning({ id: emails.id });
    
    return result.length;
  }
}

export const storage = new DatabaseStorage();
