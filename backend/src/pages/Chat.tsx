import { useState, useRef, useEffect } from 'react';
import { storage, type ChatMessage } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { chatRecommend } from '@/lib/recommendations';
import { Send } from 'lucide-react';

const QUICK_PROMPTS = [
  'What should I wear today?',
  'Outfit for a date night',
  'Office look ideas',
  'Color matching tips',
  'Weekend brunch outfit',
];

export default function ChatPage() {
  const { user } = useAuth();
  const email = user?.email || '';
  const [messages, setMessages] = useState<ChatMessage[]>(storage.getMessages(email));
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prefs = storage.getPreferences(email);
  const wardrobe = storage.getWardrobe(email);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (messages.length === 0) {
      const welcome: ChatMessage = {
        id: 'welcome',
        sender: 'vera',
        text: "Hello, I'm VÉRA — your personal styling atelier.\n\nAsk me anything: outfit pairings, color harmony, occasion dressing, or wardrobe edits.",
        timestamp: Date.now(),
      };
      setMessages([welcome]);
      storage.addMessage(email, welcome);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: trimmed, timestamp: Date.now() };
    storage.addMessage(email, userMsg);
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    window.setTimeout(() => {
      const response = chatRecommend(trimmed, wardrobe, prefs);
      const veraMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'vera',
        text: response,
        timestamp: Date.now() + 100,
      };
      storage.addMessage(email, veraMsg);
      setMessages(prev => [...prev, veraMsg]);
      setIsTyping(false);
    }, 900 + Math.random() * 500);
  };

  return (
    <div className="relative flex flex-col h-[calc(100vh-8.5rem)] max-w-lg mx-auto bg-background">
      {/* Editorial header */}
      <div className="px-5 pt-5 pb-3">
        <div className="text-center">
          <p className="font-body text-[10px] uppercase tracking-[0.4em] text-taupe mb-1.5">Always available</p>
          <h1 className="font-display text-2xl font-light italic text-foreground">VÉRA Atelier</h1>
        </div>
        <div className="h-px bg-border/50 mt-4" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-3 pb-3 scrollbar-hide">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-bubble-in`}
          >
            {msg.sender === 'vera' && (
              <div className="w-7 h-7 rounded-full nude-gradient flex items-center justify-center mr-2 mt-1 shrink-0 shadow-soft">
                <span className="font-display text-[11px] italic font-medium text-foreground">V</span>
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-3xl px-4 py-3 ${
                msg.sender === 'user'
                  ? 'bg-foreground text-cream rounded-br-md'
                  : 'bg-cream border border-border/40 text-foreground rounded-bl-md shadow-soft'
              }`}
            >
              <p className="font-body text-[14px] whitespace-pre-line leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start animate-bubble-in">
            <div className="w-7 h-7 rounded-full nude-gradient flex items-center justify-center mr-2 mt-1 shrink-0 shadow-soft">
              <span className="font-display text-[11px] italic font-medium text-foreground">V</span>
            </div>
            <div className="bg-cream border border-border/40 rounded-3xl rounded-bl-md px-4 py-3.5 shadow-soft">
              <div className="flex items-end gap-1 h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-taupe animate-typing-dot" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-taupe animate-typing-dot" style={{ animationDelay: '160ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-taupe animate-typing-dot" style={{ animationDelay: '320ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick prompts */}
      {messages.length <= 2 && !isTyping && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="shrink-0 bg-cream border border-border/50 rounded-full px-4 py-1.5 font-body text-[11px] text-foreground/85 hover:border-taupe/40 hover:bg-nude-soft transition-colors italic"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="px-4 py-3">
        <div className="h-px bg-border/50 mb-3" />
        <div className="flex items-center gap-2 bg-cream border border-border/50 rounded-full pl-5 pr-1.5 py-1.5 shadow-soft">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder="Ask VÉRA…"
            className="flex-1 bg-transparent text-foreground font-body text-sm placeholder:text-muted-foreground/70 focus:outline-none py-1.5 italic"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            aria-label="Send message"
            className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center text-cream disabled:opacity-40 transition-all hover:bg-taupe active:scale-95"
          >
            <Send size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
}
