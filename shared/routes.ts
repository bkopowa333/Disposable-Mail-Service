import { z } from 'zod';
import { emails } from './schema';

export const errorSchemas = {
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  inboxes: {
    listEmails: {
      method: 'GET' as const,
      path: '/api/inboxes/:inbox/emails' as const,
      responses: {
        200: z.array(z.custom<typeof emails.$inferSelect>()),
      },
    },
    getEmail: {
      method: 'GET' as const,
      path: '/api/emails/:id' as const,
      responses: {
        200: z.custom<typeof emails.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type EmailResponse = z.infer<typeof api.inboxes.getEmail.responses[200]>;
export type EmailListResponse = z.infer<typeof api.inboxes.listEmails.responses[200]>;
