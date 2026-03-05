import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, Loader2, ChevronDown } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 'welcome', 
      role: 'assistant', 
      content: "Hi! I'm the AI assistant for this portfolio. I can scroll to sections, highlight projects, or answer questions about my skills. Try asking 'Show me your React projects'!" 
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { mutate: sendMessage, isPending } = useChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isPending) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");

    sendMessage(userMsg.content, {
      onSuccess: (data) => {
        if (data.response) {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.response
          };
          setMessages(prev => [...prev, aiMsg]);
        }
      },
      onError: () => {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Sorry, I had trouble processing that request. Please try again."
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[350px] md:w-[400px] h-[500px] mb-4 glass-panel rounded-2xl overflow-hidden flex flex-col pointer-events-auto"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Portfolio Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Co-browsing active</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "ml-auto bg-primary text-white rounded-br-none" 
                      : "mr-auto bg-secondary text-secondary-foreground rounded-bl-none"
                  )}
                >
                  {msg.content}
                </div>
              ))}
              {isPending && (
                <div className="mr-auto bg-secondary text-secondary-foreground rounded-2xl rounded-bl-none p-3 w-16 flex items-center justify-center">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-background/50">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me to navigate or highlight..."
                  className="w-full bg-secondary/50 border border-white/5 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {["Go to projects", "My skills", "Contact info"].map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setInputValue(suggestion);
                      // Optional: auto-submit
                    }}
                    className="text-[10px] px-2 py-1 rounded-md bg-secondary/50 hover:bg-secondary text-muted-foreground whitespace-nowrap transition-colors border border-white/5"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-colors pointer-events-auto",
          isOpen ? "bg-secondary text-white hover:bg-secondary/80" : "bg-gradient-to-r from-primary to-purple-600 text-white"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
      </motion.button>
    </div>
  );
}
