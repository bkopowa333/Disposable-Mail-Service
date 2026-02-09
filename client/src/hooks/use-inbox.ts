import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useInboxEmails(inbox: string) {
  return useQuery({
    queryKey: [api.inboxes.listEmails.path, inbox],
    queryFn: async () => {
      // Don't fetch if inbox is empty
      if (!inbox) return [];
      
      const url = buildUrl(api.inboxes.listEmails.path, { inbox });
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error("Failed to fetch inbox");
      }
      
      // Parse with Zod schema from routes
      const data = await res.json();
      return api.inboxes.listEmails.responses[200].parse(data);
    },
    // Refresh every 10 seconds for new emails
    refetchInterval: 10000,
  });
}

export function useEmail(id: number) {
  return useQuery({
    queryKey: [api.inboxes.getEmail.path, id],
    queryFn: async () => {
      const url = buildUrl(api.inboxes.getEmail.path, { id });
      const res = await fetch(url);
      
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch email");
      
      const data = await res.json();
      return api.inboxes.getEmail.responses[200].parse(data);
    },
    enabled: !!id,
  });
}
