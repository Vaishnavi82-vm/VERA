import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listWardrobe, uploadWardrobeItem,
  deleteWardrobeItem, markItemWorn, type CloudWardrobeItem,
} from '@/lib/cloud';
import { Upload, Loader2, Sparkles, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import LazyImage from '@/components/LazyImage';

const CATEGORIES = ['all', 'top', 'bottom', 'dress', 'footwear', 'accessory', 'outerwear', 'ethnic', 'other'];

function normalizeCategory(category: string | undefined): string {
  const value = (category ?? '').toLowerCase().trim();
  if (!value) return 'other';
  if (['tops', 'top', 'shirt', 'shirts', 'blouse', 'blouses', 'tee', 'tshirt', 't-shirts'].includes(value)) return 'top';
  if (['bottoms', 'bottom', 'pant', 'pants', 'trouser', 'trousers', 'jeans', 'skirt', 'skirts'].includes(value)) return 'bottom';
  if (['dresses', 'dress'].includes(value)) return 'dress';
  if (['footwear', 'shoes', 'sneakers', 'boots', 'heels', 'sandals'].includes(value)) return 'footwear';
  if (['accessories', 'accessory', 'bag', 'bags', 'handbag', 'handbags', 'purse', 'clutch', 'belt', 'belts', 'jewelry', 'jewellery', 'scarf', 'scarves'].includes(value)) return 'accessory';
  if (['outerwear', 'coat', 'coats', 'jacket', 'jackets', 'blazer', 'cardigan'].includes(value)) return 'outerwear';
  if (['ethnic', 'traditional', 'sari', 'saree', 'kurta', 'lehenga', 'sherwani', 'salwar', 'kameez'].includes(value)) return 'ethnic';
  return 'other';
}

function formatCategory(category: string): string {
  if (!category) return 'Other';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export default function WardrobePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<CloudWardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadSubcategory, setUploadSubcategory] = useState('');
  const [selected, setSelected] = useState<CloudWardrobeItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setItems(await listWardrobe(user.email));
    } catch (e) {
      toast.error('Could not load wardrobe', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.email]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!uploadCategory) {
      toast.error('Select a category before uploading.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error('Image too large', { description: 'Please choose under 6MB.' });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setUploading(true);
    try {
      const item = await uploadWardrobeItem(user.email, file, uploadCategory, uploadSubcategory);
      setItems((p) => [item, ...p]);
      toast.success('Item uploaded');
    } catch (err) {
      toast.error('Upload failed', { description: (err as Error).message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async (id: string) => {
    await deleteWardrobeItem(id);
    setItems((p) => p.filter((i) => i.id !== id));
    setSelected(null);
    toast('Removed from wardrobe');
  };

  const worn = async (it: CloudWardrobeItem) => {
    await markItemWorn(it.id, it.worn_count);
    setItems((p) => p.map((i) => i.id === it.id ? { ...i, worn_count: i.worn_count + 1 } : i));
  };

  const visible = filter === 'all'
    ? items
    : items.filter((i) => normalizeCategory(i.category) === filter);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto animate-fade-in pb-12">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <div className="text-center mb-6">
        <p className="font-body text-[10px] uppercase tracking-[0.4em] text-taupe mb-2">Atelier</p>
        <h1 className="font-display text-3xl font-light italic text-foreground">Your wardrobe</h1>
        <p className="font-body text-xs text-muted-foreground mt-2 italic">{items.length} pieces · {items.filter(i => i.ai_analyzed).length} analyzed</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`shrink-0 px-3 py-1.5 rounded-full font-body text-[11px] uppercase tracking-[0.2em] border transition-all ${
              filter === c ? 'bg-foreground text-cream border-foreground' : 'bg-cream border-border text-foreground hover:border-taupe/40'
            }`}
          >{formatCategory(c)}</button>
        ))}
      </div>

      <div className="grid gap-3 mb-5 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Category</label>
          <select
            value={uploadCategory}
            onChange={(event) => setUploadCategory(event.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
          >
            <option value="" disabled hidden>Select category</option>
            {CATEGORIES.filter((c) => c !== 'all').map((c) => (
              <option key={c} value={c}>{formatCategory(c)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Subcategory</label>
          <input
            value={uploadSubcategory}
            onChange={(event) => setUploadSubcategory(event.target.value)}
            placeholder="Optional"
            className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
          />
        </div>
      </div>

      {/* Upload card */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full mb-5 py-4 rounded-2xl border border-dashed border-nude-deep/40 bg-cream hover:bg-nude-soft transition-colors flex items-center justify-center gap-2 font-body text-xs text-foreground uppercase tracking-[0.25em] disabled:opacity-60"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={13} strokeWidth={1.5} />}
        {uploading ? 'Uploading…' : 'Add an item'}
      </button>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-nude-soft animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-full nude-gradient mx-auto flex items-center justify-center mb-4">
            <Sparkles size={20} className="text-gold-deep" strokeWidth={1.5} />
          </div>
          <p className="font-display text-xl italic text-foreground mb-1">Empty shelf</p>
          <p className="font-body text-xs text-muted-foreground italic">Upload pieces to begin curation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {visible.map((it) => {
            const categoryLabel = formatCategory(normalizeCategory(it.category));
            return (
              <button key={it.id} onClick={() => setSelected(it)} className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-cream border border-border/40 shadow-soft hover:shadow-arch transition-shadow">
                <LazyImage src={it.image_url} alt={it.name ?? it.category ?? 'item'} wrapperClassName="absolute inset-0" className="w-full h-full object-cover" />
                {categoryLabel && (
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-foreground/80 text-cream text-[8px] font-body uppercase tracking-wider">
                    {categoryLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Detail sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-background border border-border rounded-3xl p-5 w-full max-w-sm shadow-arch animate-scale-in">
            <button onClick={() => setSelected(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"><X size={18} /></button>
            <div className="aspect-square rounded-2xl overflow-hidden mb-4 bg-nude-soft">
              <img src={selected.image_url} alt="" className="w-full h-full object-cover" />
            </div>
            <h3 className="font-display text-xl italic text-foreground mb-1">{selected.name ?? 'Unnamed piece'}</h3>
            {selected.ai_description && <p className="font-body text-xs text-muted-foreground italic mb-3">{selected.ai_description}</p>}
            <div className="grid grid-cols-2 gap-2 mb-4 text-[10px] font-body uppercase tracking-wider">
              {selected.category && <Detail label="Category" value={formatCategory(normalizeCategory(selected.category))} />}
              {selected.subcategory && <Detail label="Subcategory" value={selected.subcategory} />}
              {selected.style && <Detail label="Style" value={selected.style} />}
              {selected.primary_color && <Detail label="Color" value={selected.primary_color} />}
              {selected.aesthetic && <Detail label="Aesthetic" value={selected.aesthetic} />}
            </div>
            {selected.occasions?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selected.occasions.map((o) => <span key={o} className="px-2 py-0.5 rounded-full bg-nude-soft text-[10px] font-body text-taupe uppercase tracking-wider">{o}</span>)}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => worn(selected)} className="flex-1 py-2.5 rounded-full bg-foreground text-cream text-[11px] font-body uppercase tracking-[0.25em] hover:bg-taupe transition-colors inline-flex items-center justify-center gap-1.5">
                <Check size={12} /> Wore it ({selected.worn_count})
              </button>
              <button onClick={() => remove(selected.id)} className="p-2.5 rounded-full border border-border text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cream rounded-xl p-2 border border-border/40">
      <p className="text-taupe">{label}</p>
      <p className="font-display italic text-sm normal-case text-foreground tracking-normal">{value}</p>
    </div>
  );
}
