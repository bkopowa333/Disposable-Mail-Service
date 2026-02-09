import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Inbox, Shield, Clock, Zap } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [inboxName, setInboxName] = useState("");
  const [_, setLocation] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inboxName.trim()) {
      // Clean input: lowercase, alphanumeric only
      const cleanName = inboxName.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
      if (cleanName) {
        setLocation(`/inbox/${cleanName}`);
      }
    }
  };

  const features = [
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: "Private & Secure",
      desc: "No registration, no password required. Anonymous usage."
    },
    {
      icon: <Clock className="w-6 h-6 text-orange-500" />,
      title: "7-Day Storage",
      desc: "Emails are kept for 7 days before auto-deletion."
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: "Instant Access",
      desc: "Real-time email reception with no delays."
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Abstract background blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl -z-10 opacity-60 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Live Disposable Email Service
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight text-foreground mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            Keep your real inbox <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">spam-free</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            Instantly create temporary email addresses. 
            Perfect for signups, testing, and protecting your privacy.
          </p>
          
          <div className="max-w-md mx-auto animate-in fade-in zoom-in-95 duration-700 delay-300 relative z-10">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Inbox className="w-5 h-5" />
                </div>
                <Input
                  autoFocus
                  type="text"
                  placeholder="Enter inbox name..."
                  className="pl-10 h-14 rounded-xl text-lg shadow-lg border-2 focus-visible:ring-offset-0 focus-visible:border-primary transition-all"
                  value={inboxName}
                  onChange={(e) => setInboxName(e.target.value)}
                />
              </div>
              <Button 
                type="submit" 
                size="lg" 
                className="h-14 px-8 rounded-xl font-bold text-lg shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all"
                disabled={!inboxName.trim()}
              >
                Open Inbox
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </form>
            <p className="mt-4 text-sm text-muted-foreground">
              Try: <button onClick={() => setLocation('/inbox/demo')} className="text-primary hover:underline font-medium">demo</button>, <button onClick={() => setLocation('/inbox/test')} className="text-primary hover:underline font-medium">test</button>
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-card border-y">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="p-8 rounded-2xl bg-background border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 group"
              >
                <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-6 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
