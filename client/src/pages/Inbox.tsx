import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { 
  RefreshCw, 
  Search, 
  Mail, 
  ChevronRight, 
  AlertCircle,
  Inbox as InboxIcon,
  Menu,
  X
} from "lucide-react";
import { useInboxEmails, useEmail } from "@/hooks/use-inbox";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmailViewer } from "@/components/EmailViewer";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Inbox() {
  const { name } = useParams<{ name: string }>();
  const [_, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Ensure inbox name is lowercase
  const inboxName = name?.toLowerCase() || "";

  const { 
    data: emails = [], 
    isLoading: isLoadingList, 
    refetch: refreshList,
    isRefetching 
  } = useInboxEmails(inboxName);

  const { 
    data: selectedEmail, 
    isLoading: isLoadingEmail 
  } = useEmail(selectedId || 0);

  // Filter emails based on search
  const filteredEmails = emails.filter(email => 
    email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.sender.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle inbox switching
  const handleInboxChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newInbox = formData.get("inbox") as string;
    if (newInbox) {
      setLocation(`/inbox/${newInbox.toLowerCase()}`);
      setSelectedId(null);
      setMobileMenuOpen(false);
    }
  };

  // Select first email on desktop load if none selected (optional, disabled for now to show empty state)
  // useEffect(() => {
  //   if (!selectedId && filteredEmails.length > 0 && window.innerWidth >= 1024) {
  //     setSelectedId(filteredEmails[0].id);
  //   }
  // }, [emails]);

  return (
    <Layout>
      <div className="h-[calc(100vh-64px)] flex overflow-hidden">
        
        {/* Sidebar - Desktop */}
        <div className="hidden md:flex w-80 lg:w-96 flex-col border-r bg-muted/30">
          <div className="p-4 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <InboxIcon className="w-4 h-4" />
                </div>
                {inboxName}
              </h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => refreshList()} 
                disabled={isRefetching}
                className={isRefetching ? "animate-spin" : ""}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search emails..." 
                className="pl-9 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoadingList ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                <Mail className="w-12 h-12 mb-4 opacity-20" />
                <p>No emails found</p>
                {searchQuery && <p className="text-sm mt-1">Try a different search term</p>}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => setSelectedId(email.id)}
                    className={`w-full text-left p-4 hover:bg-card transition-colors relative group ${
                      selectedId === email.id ? "bg-card border-l-4 border-l-primary shadow-sm" : "border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-semibold text-sm truncate pr-2 ${selectedId === email.id ? "text-primary" : "text-foreground"}`}>
                        {email.sender}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium mb-1 truncate text-foreground/90">
                      {email.subject || "(No Subject)"}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate opacity-80">
                      {email.bodyText?.slice(0, 60) || "No preview available..."}
                    </p>
                    
                    {/* Hover indicator */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t bg-background/50">
            <form onSubmit={handleInboxChange} className="flex gap-2">
              <Input 
                name="inbox" 
                placeholder="Switch inbox..." 
                className="h-9 text-sm bg-background" 
              />
              <Button size="sm" type="submit" variant="secondary">Go</Button>
            </form>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col bg-muted/10 h-full overflow-hidden relative ${selectedId ? 'z-20' : ''}`}>
          
          {/* Mobile Header when viewing list */}
          <div className="md:hidden flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0">
                  <div className="h-full flex flex-col">
                    <div className="p-6 border-b">
                      <h2 className="font-display font-bold text-xl mb-1">TempMail</h2>
                      <p className="text-sm text-muted-foreground">Disposable Inbox</p>
                    </div>
                    <div className="p-4">
                      <form onSubmit={handleInboxChange} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Current Inbox</label>
                          <div className="flex gap-2">
                            <Input name="inbox" defaultValue={inboxName} />
                            <Button type="submit">Go</Button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <span className="font-bold text-lg">{inboxName}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refreshList()}>
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Mobile List View (only visible when no email selected) */}
          <div className={`flex-1 overflow-y-auto md:hidden ${selectedId ? 'hidden' : 'block'}`}>
            {isLoadingList ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
                <Mail className="w-12 h-12 mb-2 opacity-20" />
                <p>No emails</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedId(email.id)}
                    className="p-4 active:bg-muted transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-foreground">{email.sender}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(email.receivedAt))}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium mb-1">{email.subject}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {email.bodyText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Detail View / Mobile Detail Modal */}
          <div className={`
            absolute inset-0 md:static md:flex-1 bg-background md:bg-transparent
            transition-transform duration-300 ease-in-out z-30
            ${selectedId ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
            flex flex-col md:p-6
          `}>
            {selectedId ? (
              isLoadingEmail ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : selectedEmail ? (
                <EmailViewer 
                  email={selectedEmail} 
                  onBack={() => setSelectedId(null)}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                  <AlertCircle className="w-10 h-10 mb-4 text-destructive" />
                  <p>Email not found or expired.</p>
                  <Button variant="link" onClick={() => setSelectedId(null)}>Back to list</Button>
                </div>
              )
            ) : (
              /* Empty State for Desktop */
              <div className="hidden md:flex flex-col items-center justify-center h-full text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-card/50 m-4">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                  <Mail className="w-10 h-10 opacity-20" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Select an email to read</h3>
                <p className="max-w-xs text-center">
                  Choose an email from the sidebar to view its contents here.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
}
