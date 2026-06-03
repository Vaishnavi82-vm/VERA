import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listWardrobe, generateOutfits, generateCollage, saveOutfit, markOutfitWorn,
  recordFeedback, listOutfits,
  type CloudOutfit, type CloudWardrobeItem,
} from '@/lib/cloud';
import { Sparkles, Heart, Bookmark, RefreshCw, Loader2, Wand2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import LazyImage from '@/components/LazyImage';

const OCCASIONS = ['everyday', 'work', 'date', 'brunch', 'party', 'travel', 'wedding'];
const MOODS = ['confident', 'romantic', 'minimal', 'playful', 'powerful'];

export default function OutfitsPage() {
  const { user } = useAuth();
  const [wardrobe, setWardrobe] = useState<CloudWardrobeItem[]>([]);
  const [outfits, setOutfits] = useState<CloudOutfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [occasion, setOccasion] = useState('everyday');
  const [mood, setMood] = useState<string | undefined>();
  const [collageLoading, setCollageLoading] = useState<string | null>(null);

  const itemMap = new Map(wardrobe.map((w) => [w.id, w]));

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [w, o] = await Promise.all([
        listWardrobe(user.email),
        listOutfits(user.id, { limit: 12 }),
      ]);
      setWardrobe(w);
      setOutfits(o);
    } catch (e) {
      toast.error('Could not load', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const regenerate = async () => {
    if (wardrobe.length < 2) {
      toast.error('Add wardrobe pieces', { description: 'You need at least 2 items.' });
      return;
    }
    setGenerating(true);
    try {
      const fresh = await generateOutfits({ occasion, mood, count: 5 });
      if (!fresh.length) {
        toast.error('No outfits returned', { description: 'Try a different occasion or add more pieces.' });
      } else {
        toast.success(`${fresh.length} new looks curated`);
        setOutfits((p) => [...fresh, ...p].slice(0, 20));
      }
    } catch (e) {
      toast.error('Generation failed', { description: (e as Error).message });
    } finally {
      setGenerating(false);
    }
  };

  const buildCollage = async (outfit: CloudOutfit) => {
    setCollageLoading(outfit.id);
    try {
      const url = await generateCollage(outfit.id);
      setOutfits((p) => p.map((o) => o.id === outfit.id ? { ...o, collage_url: url } : o));
      toast.success('Collage ready');
    } catch (e) {
      toast.error('Collage failed', { description: (e as Error).message });
    } finally {
      setCollageLoading(null);
    }
  };

  const onSave = async (o: CloudOutfit) => {
    await saveOutfit(o.id, !o.saved);
    setOutfits((p) => p.map((x) => x.id === o.id ? { ...x, saved: !o.saved } : x));
    toast(o.saved ? 'Removed from saved' : 'Saved to atelier');
  };

  const onWear = async (o: CloudOutfit) => {
    await markOutfitWorn(o.id);
    if (user) await recordFeedback(user.id, o.id, true);
    setOutfits((p) => p.map((x) => x.id === o.id ? { ...x, worn: true } : x));
    toast.success('Marked as worn today');
  };

  const onSkip = async (o: CloudOutfit) => {
    if (user) await recordFeedback(user.id, o.id, false);
    setOutfits((p) => p.filter((x) => x.id !== o.id));
  };

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6">
        <p className="font-body text-[10px] uppercase tracking-[0.4em] text-taupe mb-2 inline-flex items-center gap-2 justify-center">
          <Sparkles size={11} className="text-gold" strokeWidth={1.5} />
          AI Stylist
          <Sparkles size={11} className="text-gold" strokeWidth={1.5} />
        </p>
        <h1 className="font-display text-3xl font-light italic text-foreground">Curated looks</h1>
        <div className="mx-auto mt-2 h-px w-14 gold-accent-gradient opacity-70" />
      </div>

      {/* Controls */}
      <div className="bg-cream rounded-3xl border border-border/40 p-4 mb-6 shadow-soft">
        <p className="font-body text-[10px] uppercase tracking-[0.3em] text-taupe mb-2">Occasion</p>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {OCCASIONS.map((o) => (
            <button key={o} onClick={() => setOccasion(o)}
              className={`px-3 py-1 rounded-full text-[11px] font-body uppercase tracking-wider border transition-all ${
                occasion === o ? 'bg-foreground text-cream border-foreground' : 'bg-background border-border text-foreground hover:border-taupe/40'
              }`}>{o}</button>
          ))}
        </div>
        <p className="font-body text-[10px] uppercase tracking-[0.3em] text-taupe mb-2">Mood</p>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {MOODS.map((m) => (
            <button key={m} onClick={() => setMood(mood === m ? undefined : m)}
              className={`px-3 py-1 rounded-full text-[11px] font-body uppercase tracking-wider border transition-all ${
                mood === m ? 'bg-gold-deep text-cream border-gold-deep' : 'bg-background border-border text-foreground hover:border-gold/40'
              }`}>{m}</button>
          ))}
        </div>
        <button onClick={regenerate} disabled={generating}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full gold-accent-gradient text-cream font-body text-xs uppercase tracking-[0.3em] shadow-gold hover:opacity-90 transition-opacity disabled:opacity-60">
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          {generating ? 'AI is styling…' : 'Generate outfits'}
        </button>
      </div>

      {/* Outfit list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-72 rounded-3xl bg-nude-soft animate-pulse" />
          ))}
        </div>
      ) : outfits.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full nude-gradient mx-auto flex items-center justify-center mb-4 shadow-soft">
            <Wand2 size={20} className="text-gold-deep" strokeWidth={1.5} />
          </div>
          <p className="font-display text-xl italic text-foreground mb-1">No looks yet</p>
          <p className="font-body text-xs text-muted-foreground italic">Tap Generate to let VÉRA style you.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {outfits.map((o) => (
            <OutfitCard
              key={o.id}
              outfit={o}
              items={o.item_ids.map((id) => itemMap.get(id)).filter(Boolean) as CloudWardrobeItem[]}
              onSave={() => onSave(o)}
              onWear={() => onWear(o)}
              onSkip={() => onSkip(o)}
              onCollage={() => buildCollage(o)}
              collageLoading={collageLoading === o.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OutfitCard({ outfit, items, onSave, onWear, onSkip, onCollage, collageLoading }: {
  outfit: CloudOutfit; items: CloudWardrobeItem[];
  onSave: () => void; onWear: () => void; onSkip: () => void;
  onCollage: () => void; collageLoading: boolean;
}) {
  return (
    <article className="bg-cream rounded-3xl border border-border/40 shadow-arch overflow-hidden animate-fade-in">
      {/* Visual */}
      <div className="relative bg-gradient-to-br from-nude-soft via-cream to-sand/40">
        {outfit.collage_url ? (
          <LazyImage src={outfit.collage_url} alt={outfit.title} wrapperClassName="aspect-square w-full" className="w-full h-full object-cover" />
        ) : (
          <div className="aspect-square w-full p-6 grid grid-cols-2 gap-3 items-center">
            {items.slice(0, 4).map((it) => (
              <div key={it.id} className="aspect-square rounded-2xl overflow-hidden bg-cream border border-border/40 shadow-soft">
                <img src={it.image_url} alt={it.name ?? ''} className="w-full h-full object-cover" />
              </div>
            ))}
            {items.length === 0 && <p className="col-span-2 text-center text-xs font-body text-muted-foreground italic">Items not available</p>}
          </div>
        )}
        <div className="absolute top-0 left-6 right-6 h-px gold-accent-gradient opacity-50" />
        {outfit.confidence != null && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-cream/90 text-[9px] font-body uppercase tracking-wider text-gold-deep">
            {Math.round(outfit.confidence * 100)}% match
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="font-body text-[10px] uppercase tracking-[0.3em] text-taupe mb-1">{outfit.occasion ?? 'curated'}</p>
            <h3 className="font-display text-xl italic text-foreground leading-tight">{outfit.title}</h3>
          </div>
        </div>
        {outfit.reasoning && <p className="font-body text-[13px] text-foreground/80 italic leading-relaxed mb-3">{outfit.reasoning}</p>}
        {outfit.color_harmony && <p className="font-body text-[11px] text-taupe mb-3"><span className="uppercase tracking-wider mr-1">Palette ·</span>{outfit.color_harmony}</p>}
        {outfit.suggested_accessories?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {outfit.suggested_accessories.map((a) => (
              <span key={a} className="px-2 py-0.5 rounded-full bg-nude-soft text-[10px] font-body text-taupe uppercase tracking-wider">+ {a}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={onSkip} aria-label="Skip"
            className="w-10 h-10 rounded-full bg-background border border-border/50 flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
            <X size={15} strokeWidth={1.5} />
          </button>
          <button onClick={onWear}
            className="flex-1 py-2.5 rounded-full gold-accent-gradient text-cream font-body text-[11px] uppercase tracking-[0.3em] shadow-gold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-1.5">
            <Check size={13} /> {outfit.worn ? 'Worn today' : 'Wear today'}
          </button>
          <button onClick={onSave} aria-label="Save"
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${outfit.saved ? 'bg-gold-deep/10 border-gold/50 text-gold-deep' : 'bg-background border-border/50 text-foreground hover:border-gold/40'}`}>
            <Bookmark size={14} strokeWidth={1.8} className={outfit.saved ? 'fill-gold-deep/30' : ''} />
          </button>
          {!outfit.collage_url && (
            <button onClick={onCollage} disabled={collageLoading} aria-label="Generate AI collage"
              className="w-10 h-10 rounded-full bg-background border border-border/50 flex items-center justify-center hover:border-gold/40 text-foreground transition-colors disabled:opacity-60">
              {collageLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-gold-deep" />}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
