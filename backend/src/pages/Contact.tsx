import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { storage, type ContactMessage } from '@/lib/storage';
import { Mail, MessageCircle, Instagram, MapPin, Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const TOPICS = ['General', 'Styling help', 'Account', 'Feedback', 'Partnership'];

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Contact() {
  const { user } = useAuth();
  const email = user?.email || '';

  const [name, setName] = useState(user?.name || '');
  const [contactEmail, setContactEmail] = useState(email);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; body?: string }>({});
  const [history, setHistory] = useState<ContactMessage[]>([]);

  useEffect(() => {
    setHistory(storage.getContactMessages(email));
  }, [email]);

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Please enter your name';
    if (!/^\S+@\S+\.\S+$/.test(contactEmail.trim())) next.email = 'Please enter a valid email';
    if (body.trim().length < 10) next.body = 'Tell us a bit more (10+ chars)';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    storage.addContactMessage(email, {
      name: name.trim(),
      email: contactEmail.trim(),
      topic,
      body: body.trim(),
    });
    setHistory(storage.getContactMessages(email));
    setBody('');
    setErrors({});
    toast.success('Message received', { description: 'We’ll reply within 1–2 days.' });
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto animate-fade-in pb-12 space-y-6">
      {/* Editorial header */}
      <div className="text-center">
        <p className="font-body text-[10px] uppercase tracking-[0.4em] text-taupe mb-2">We’re listening</p>
        <h1 className="font-display text-3xl font-light italic text-foreground">Contact</h1>
        <p className="font-body text-xs text-muted-foreground mt-2 italic">
          Anything from styling questions to feedback — say hello.
        </p>
      </div>

      {/* Quick channels */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Mail, label: 'Email', value: 'hello@vera-style.com', href: 'mailto:hello@vera-style.com' },
          { icon: MessageCircle, label: 'Live chat', value: 'Inside VÉRA', href: '/chat' },
          { icon: Instagram, label: 'Instagram', value: '@vera.atelier', href: 'https://instagram.com' },
          { icon: MapPin, label: 'Atelier', value: 'Paris · Mumbai', href: undefined },
        ].map(c => {
          const Icon = c.icon;
          const inner = (
            <div className="bg-cream rounded-2xl border border-border/40 shadow-card p-4 h-full hover:bg-nude-soft transition-colors">
              <Icon size={14} className="text-taupe mb-2" strokeWidth={1.5} />
              <p className="font-body text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{c.label}</p>
              <p className="font-display text-sm italic text-foreground mt-0.5 truncate">{c.value}</p>
            </div>
          );
          return c.href ? (
            <a key={c.label} href={c.href} className="block">{inner}</a>
          ) : (
            <div key={c.label}>{inner}</div>
          );
        })}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-cream rounded-3xl border border-border/40 shadow-card p-6 space-y-4">
        <div>
          <p className="font-body text-[10px] uppercase tracking-[0.3em] text-taupe mb-2">Send a message</p>
          <h2 className="font-display text-xl italic font-light text-foreground">Write to VÉRA</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-body uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
              Name
            </label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: undefined })); }}
              className={`w-full bg-background border rounded-full px-4 py-2.5 text-foreground font-body text-sm focus:outline-none focus:ring-1 transition-all ${
                errors.name ? 'border-destructive/60 focus:ring-destructive/30' : 'border-border focus:ring-taupe/40'
              }`}
              placeholder="Your name"
            />
            {errors.name && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle size={10} className="text-destructive shrink-0" />
                <p className="font-body text-[10px] text-destructive italic">{errors.name}</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-body uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => { setContactEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
              className={`w-full bg-background border rounded-full px-4 py-2.5 text-foreground font-body text-sm focus:outline-none focus:ring-1 transition-all ${
                errors.email ? 'border-destructive/60 focus:ring-destructive/30' : 'border-border focus:ring-taupe/40'
              }`}
              placeholder="you@email.com"
            />
            {errors.email && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle size={10} className="text-destructive shrink-0" />
                <p className="font-body text-[10px] text-destructive italic">{errors.email}</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-body uppercase tracking-[0.25em] text-muted-foreground mb-2">
            Topic
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TOPICS.map(t => {
              const active = topic === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={`px-3.5 py-1.5 rounded-full font-body text-[11px] transition-all ${
                    active
                      ? 'bg-foreground text-cream'
                      : 'bg-background border border-border text-foreground/80 hover:border-taupe/40'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-body uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
            Message
          </label>
          <textarea
            value={body}
            onChange={e => { setBody(e.target.value); if (errors.body) setErrors(p => ({ ...p, body: undefined })); }}
            rows={5}
            placeholder="How can we help?"
            className={`w-full bg-background border rounded-2xl px-5 py-3 text-foreground font-body text-sm focus:outline-none focus:ring-1 transition-all resize-none ${
              errors.body ? 'border-destructive/60 focus:ring-destructive/30' : 'border-border focus:ring-taupe/40'
            }`}
            maxLength={1000}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.body
              ? <p className="font-body text-[11px] text-destructive italic">{errors.body}</p>
              : <span />}
            <p className="font-body text-[10px] text-muted-foreground tracking-wider">{body.length}/1000</p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-foreground text-cream font-body py-3 rounded-full uppercase tracking-[0.3em] text-xs hover:bg-taupe transition-colors flex items-center justify-center gap-2"
        >
          <Send size={13} strokeWidth={1.6} />
          Send message
        </button>
      </form>

      {/* History */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="font-body text-[10px] uppercase tracking-[0.3em] text-taupe">Your messages</p>
            <span className="font-body text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {history.length}
            </span>
          </div>
          <ul className="space-y-2">
            {history.map(m => (
              <li key={m.id} className="bg-cream rounded-2xl border border-border/40 shadow-card p-4 animate-fade-in">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-body text-[10px] uppercase tracking-[0.25em] text-taupe">{m.topic}</span>
                  <span className="font-body text-[10px] text-muted-foreground tracking-wider">{formatDate(m.createdAt)}</span>
                </div>
                <p className="font-body text-sm text-foreground/85 leading-relaxed line-clamp-3">{m.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
