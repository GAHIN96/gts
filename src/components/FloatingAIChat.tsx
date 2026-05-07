import { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  Send,
  X,
  MessageCircle,
  Loader2,
  Minimize2,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { useAuth } from "@/contexts/AuthContext";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type PanelView = "menu" | "chat";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-assistant`;

const TEAMS = [
  { key: "operations", label: "Operations Team", desc: "Bookings, vouchers & travel ops", number: "964770000001", color: "bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20" },
  { key: "sales", label: "Sales Team", desc: "Quotes, packages & new bookings", number: "964770000002", color: "bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20" },
  { key: "finance", label: "Finance Team", desc: "Payments, invoices & credit", number: "964770000003", color: "bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20" },
  { key: "technical", label: "Technical Team", desc: "System issues & account access", number: "964770000004", color: "bg-violet-500/10 text-violet-600 group-hover:bg-violet-500/20" },
];

export function FloatingAIChat() {
  const { role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<PanelView>("menu");
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your GTS travel assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (role !== "agency") return null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to get response");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantContent = "";

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", timestamp: new Date() },
    ]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantContent,
                timestamp: new Date(),
              };
              return updated;
            });
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat([...messages, userMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content === "") {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const openWhatsApp = (number: string, team: string) => {
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(`Hello ${team}, I need assistance.`)}`, "_blank");
  };

  // Closed state — vertically centered "Need Help?" pill button
  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setView("menu"); }}
        className="group fixed top-1/2 -translate-y-1/2 right-0 z-50 flex flex-col items-center gap-2.5 rounded-l-2xl bg-gradient-to-b from-primary via-primary to-accent text-primary-foreground px-3 py-6 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] hover:px-4 hover:shadow-[0_15px_50px_-10px_hsl(var(--primary)/0.8)] transition-all duration-300 ring-1 ring-primary-foreground/10 hover:ring-primary-foreground/20"
        aria-label="Need help?"
      >
        <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-12 w-1 rounded-full bg-primary-foreground/30 group-hover:bg-primary-foreground/60 transition-colors" />
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-primary-foreground/20 animate-ping" />
          <HelpCircle className="relative h-5 w-5 shrink-0 drop-shadow" />
        </div>
        <span
          className="text-[11px] font-bold tracking-[0.25em] uppercase drop-shadow-sm"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          Need Help?
        </span>
      </button>
    );
  }

  // Menu view
  if (view === "menu" && !isMinimized) {
    return (
      <div className="fixed top-1/2 -translate-y-1/2 right-4 z-50 w-[360px] bg-card/95 backdrop-blur-2xl border border-border/60 shadow-[0_25px_80px_-15px_hsl(var(--primary)/0.35)] rounded-3xl overflow-hidden animate-in slide-in-from-right-8 fade-in duration-300 ring-1 ring-foreground/5">
        {/* Header with rich gradient + decorative blobs */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary-foreground/10 blur-2xl" />
          <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-accent/30 blur-2xl" />
          <div className="relative flex items-center justify-between px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 rounded-2xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-primary-foreground/25 shadow-inner">
                <HelpCircle className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-primary animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-[15px] leading-tight tracking-tight">How can we help?</p>
                <p className="text-[11px] text-primary-foreground/70 mt-0.5">Choose an option below</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/15"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Options */}
        <div className="p-3.5 space-y-2 max-h-[65vh] overflow-y-auto bg-gradient-to-b from-transparent to-muted/30">
          {/* WhatsApp Teams */}
          <div className="flex items-center gap-2 px-1 pt-1 pb-1">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Contact a team on WhatsApp</p>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
          </div>
          {TEAMS.map((t) => (
            <button
              key={t.key}
              onClick={() => openWhatsApp(t.number, t.label)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/70 bg-card hover:bg-accent/40 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group text-left"
            >
              <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:rotate-[-4deg] ring-1 ring-border/50", t.color)}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-foreground truncate">{t.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.desc}</p>
              </div>
              <span className="text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all">›</span>
            </button>
          ))}

          {/* AI Assistant */}
          <div className="flex items-center gap-2 px-1 pt-3 pb-1">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Or ask our AI</p>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
          </div>
          <button
            onClick={() => setView("chat")}
            className="relative w-full flex items-center gap-3 p-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 hover:from-primary/10 hover:to-accent/10 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group text-left overflow-hidden"
          >
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-colors" />
            <div className="relative h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-lg shadow-primary/30 ring-1 ring-primary-foreground/20 group-hover:scale-105 transition-transform">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="relative min-w-0 flex-1">
              <p className="font-bold text-sm text-foreground">Ask a Question</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">AI assistant ready to help</p>
            </div>
            <span className="relative text-primary group-hover:translate-x-0.5 transition-transform">›</span>
          </button>
        </div>

        <div className="px-5 py-3 border-t border-border/50 bg-card/60 backdrop-blur-sm">
          <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            We typically respond within minutes
          </p>
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div
      className={cn(
        "fixed top-1/3 -translate-y-1/4 right-4 z-50 bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 animate-in slide-in-from-right-8 fade-in",
        isMinimized ? "w-80 h-14" : "w-96 h-[500px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-navy text-primary-foreground">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("menu")}
            className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
          >
            <Bot className="h-4 w-4" />
          </button>
          <div>
            <p className="font-semibold text-sm">GTS Assistant</p>
            <p className="text-[10px] text-primary-foreground/70">Always ready to help</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea ref={scrollRef} className="h-[380px] px-4 py-3">
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-3 py-2 rounded-2xl text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary border border-border rounded-bl-md"
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className={cn(
                      "text-[10px] mt-1",
                      msg.role === "user" ? "text-primary-foreground/70 text-right" : "text-muted-foreground"
                    )}>
                      {format(msg.timestamp, "h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.content === "" && (
                <div className="flex justify-start">
                  <div className="bg-secondary border border-border rounded-2xl rounded-bl-md px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                disabled={isLoading}
                className="flex-1 rounded-full text-sm h-9 bg-secondary border-0"
              />
              <Button
                type="submit"
                variant="navy"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="rounded-full h-9 w-9 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
