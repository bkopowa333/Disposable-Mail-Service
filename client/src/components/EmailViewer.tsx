import { useState, useMemo } from "react";
import DOMPurify from "dompurify";
import { format } from "date-fns";
import { Copy, AlertCircle, ArrowLeft, MoreHorizontal, Reply, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { EmailResponse } from "@shared/routes";

interface EmailViewerProps {
  email: EmailResponse;
  onBack?: () => void;
}

export function EmailViewer({ email, onBack }: EmailViewerProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');

  // Sanitize HTML content to prevent XSS
  const sanitizedContent = useMemo(() => {
    if (!email.bodyHtml) return null;
    return DOMPurify.sanitize(email.bodyHtml);
  }, [email.bodyHtml]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: `${label} copied to clipboard`,
      duration: 2000,
    });
  };

  const senderInitial = email.sender.charAt(0).toUpperCase();
  const senderName = email.sender.split('<')[0].trim() || email.sender;
  const senderEmail = email.sender.match(/<(.+)>/)?.[1] || email.sender;

  return (
    <div className="h-full flex flex-col bg-card rounded-xl border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Header Actions */}
      <div className="p-4 border-b flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Reply className="w-4 h-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cannot reply (Receive only)</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Auto-deletes in 7 days</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          {email.bodyHtml && email.bodyText && (
            <div className="flex bg-muted p-1 rounded-lg">
              <button
                onClick={() => setViewMode('html')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'html' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                HTML
              </button>
              <button
                onClick={() => setViewMode('text')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'text' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Text
              </button>
            </div>
          )}
          
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Email Metadata */}
      <div className="p-6 border-b bg-card">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-xl md:text-2xl font-bold font-display leading-tight">
            {email.subject || "(No Subject)"}
          </h2>
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-1 rounded-md">
            {format(new Date(email.receivedAt), "MMM d, h:mm a")}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10 border-2 border-primary/10 bg-primary/5">
            <AvatarFallback className="text-primary font-bold">{senderInitial}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground truncate">{senderName}</span>
              <span className="text-muted-foreground text-sm truncate hidden sm:inline">&lt;{senderEmail}&gt;</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>To:</span>
              <div 
                className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer group"
                onClick={() => copyToClipboard(`${email.inbox}@yopmail.com`, "Email address")}
              >
                <span className="font-medium bg-muted/50 px-1.5 py-0.5 rounded text-xs">{email.inbox}</span>
                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="flex-1 overflow-auto bg-white p-6 min-h-[400px]">
        {viewMode === 'html' && sanitizedContent ? (
          <div 
            className="prose prose-sm md:prose-base max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        ) : (
          <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-800">
            {email.bodyText || "No text content available."}
          </div>
        )}
      </div>

      {/* Safety Warning */}
      <div className="bg-amber-50 border-t border-amber-100 p-3 flex items-center gap-3 text-amber-800 text-xs md:text-sm">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <p>
          This is a public, disposable inbox. Do not receive sensitive passwords or banking information here.
          Messages are deleted automatically after 7 days.
        </p>
      </div>
    </div>
  );
}
