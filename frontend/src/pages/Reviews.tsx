import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listReviews, addReview, deleteReview, type CloudReview } from '@/lib/cloud';
import { Star, Trash2, MessageSquareQuote } from 'lucide-react';
import { toast } from 'sonner';

const RATING_LABELS = ['', 'Needs work', 'Fair', 'Good', 'Lovely', 'Iconic'];

function formatDate(dateInput: string | number) {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Reviews() {
  const { user } = useAuth();
  const email = user?.email || '';

  const [reviews, setReviews] = useState<CloudReview[]>([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<{ rating?: string; title?: string; body?: string }>({});

  useEffect(() => {
    if (email) {
      listReviews(email).then(setReviews);
    }
  }, [email]);

  const avg = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  const validate = () => {
    const next: typeof errors = {};
    if (rating < 1) next.rating = 'Choose a rating';
    if (!title.trim()) next.title = 'Add a short headline';
    if (body.trim().length < 10) next.body = 'Tell us a bit more (10+ chars)';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    addReview(email, { rating, title: title.trim(), body: body.trim() })
      .then(newReview => {
        setReviews(prev => [newReview, ...prev]);
        setRating(0); 
        setHoverRating(0); 
        setTitle(''); 
        setBody(''); 
        setErrors({});
        toast.success('Review shared', { description: 'Thank you — your words help us grow.' });
      })
      .catch(() => {
        toast.error('Failed to save review');
      });
  };

  const handleDelete = (id: string) => {
    deleteReview(id)
      .then(() => {
        setReviews(prev => prev.filter(r => r.id !== id));
        toast('Review removed');
      })
      .catch(() => {
        toast.error('Failed to delete review');
      });
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto animate-fade-in pb-12 space-y-6">
      {/* Editorial header */}
      <div className="text-center">
        <p className="font-body text-[10px] uppercase tracking-[0.4em] text-taupe mb-2">Your voice</p>
        <h1 className="font-display text-3xl font-light italic text-foreground">Reviews</h1>
        <p className="font-body text-xs text-muted-foreground mt-2 italic">
          Share your VÉRA experience — every word is read.
        </p>
      </div>

      {/* Average + count plate */}
      <div className="bg-cream rounded-3xl border border-border/40 shadow-card p-5 flex items-center justify-between">
        <div>
          <p className="font-body text-[10px] uppercase tracking-[0.3em] text-taupe mb-1">Your average</p>
          <p className="font-display text-3xl font-light italic text-foreground">{avg}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-0.5 justify-end mb-1">
            {[1,2,3,4,5].map(i => {
              const filled = typeof avg === 'string' && avg !== '—' && i <= Math.round(parseFloat(avg));
              return (
                <Star
                  key={i}
                  size={14}
                  strokeWidth={1.5}
                  className={filled ? 'text-foreground fill-foreground' : 'text-border'}
                />
              );
            })}
          </div>
          <p className="font-body text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit} className="bg-cream rounded-3xl border border-border/40 shadow-card p-6 space-y-4">
        <div>
          <p className="font-body text-[10px] uppercase tracking-[0.3em] text-taupe mb-2">Leave a review</p>
          <h2 className="font-display text-xl italic font-light text-foreground">How was your atelier?</h2>
        </div>

        {/* Star picker */}
        <div>
          <div className="flex items-center gap-1.5">
            {[1,2,3,4,5].map(i => {
              const active = i <= (hoverRating || rating);
              return (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => { setRating(i); setErrors(p => ({ ...p, rating: undefined })); }}
                  aria-label={`${i} star${i === 1 ? '' : 's'}`}
                  className="p-1 transition-transform active:scale-90"
                >
                  <Star
                    size={26}
                    strokeWidth={1.5}
                    className={active ? 'text-foreground fill-foreground' : 'text-border hover:text-taupe'}
                  />
                </button>
              );
            })}
            <span className="ml-2 font-body text-[11px] italic text-muted-foreground">
              {(hoverRating || rating) > 0 ? RATING_LABELS[hoverRating || rating] : 'Tap to rate'}
            </span>
          </div>
          {errors.rating && <p className="mt-1 font-body text-[11px] text-destructive italic">{errors.rating}</p>}
        </div>

        {/* Title */}
        <div>
          <label className="block text-[10px] font-body uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
            Headline
          </label>
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); if (errors.title) setErrors(p => ({ ...p, title: undefined })); }}
            placeholder="A quietly perfect atelier"
            className={`w-full bg-background border rounded-full px-5 py-3 text-foreground font-body text-sm focus:outline-none focus:ring-1 transition-all ${
              errors.title ? 'border-destructive/60 focus:ring-destructive/30' : 'border-border focus:ring-taupe/40'
            }`}
            maxLength={80}
          />
          {errors.title && <p className="mt-1 font-body text-[11px] text-destructive italic">{errors.title}</p>}
        </div>

        {/* Body */}
        <div>
          <label className="block text-[10px] font-body uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
            Your review
          </label>
          <textarea
            value={body}
            onChange={e => { setBody(e.target.value); if (errors.body) setErrors(p => ({ ...p, body: undefined })); }}
            placeholder="What did you love? What could be softer?"
            rows={4}
            className={`w-full bg-background border rounded-2xl px-5 py-3 text-foreground font-body text-sm focus:outline-none focus:ring-1 transition-all resize-none ${
              errors.body ? 'border-destructive/60 focus:ring-destructive/30' : 'border-border focus:ring-taupe/40'
            }`}
            maxLength={600}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.body
              ? <p className="font-body text-[11px] text-destructive italic">{errors.body}</p>
              : <span />}
            <p className="font-body text-[10px] text-muted-foreground tracking-wider">{body.length}/600</p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-foreground text-cream font-body py-3 rounded-full uppercase tracking-[0.3em] text-xs hover:bg-taupe transition-colors"
        >
          Share review
        </button>
      </form>

      {/* List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="font-body text-[10px] uppercase tracking-[0.3em] text-taupe">Your reviews</p>
          <span className="font-body text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {reviews.length}
          </span>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-cream rounded-3xl border border-border/40 shadow-card text-center py-12 px-6">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full nude-gradient flex items-center justify-center shadow-soft">
              <MessageSquareQuote size={18} className="text-foreground/70" strokeWidth={1.5} />
            </div>
            <p className="font-display text-lg italic font-light text-foreground mb-1">No reviews yet</p>
            <p className="font-body text-xs text-muted-foreground italic">
              Your first review will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {reviews.map(r => (
              <li
                key={r.id}
                className="bg-cream rounded-3xl border border-border/40 shadow-card p-5 animate-fade-in"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-0.5 mb-1.5">
                      {[1,2,3,4,5].map(i => (
                        <Star
                          key={i}
                          size={12}
                          strokeWidth={1.5}
                          className={i <= r.rating ? 'text-foreground fill-foreground' : 'text-border'}
                        />
                      ))}
                    </div>
                    <h3 className="font-display text-base italic font-light text-foreground leading-snug">
                      {r.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    aria-label="Delete review"
                    className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </div>
                <p className="font-body text-sm text-foreground/85 leading-relaxed">{r.body}</p>
                <p className="mt-3 font-body text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  {formatDate(r.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
