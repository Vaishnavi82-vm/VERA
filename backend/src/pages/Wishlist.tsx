import { useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import LazyImage from '@/components/LazyImage';

export default function Wishlist() {
  const { user } = useAuth();
  const email = user?.email || '';
  const [wishlist, setWishlist] = useState<string[]>(() => storage.getWishlist(email));
  const wardrobe = storage.getWardrobe(email);
  const items = wardrobe.filter(i => wishlist.includes(i.id));

  // Cross-tab sync — react if wishlist is changed elsewhere.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === `vera_wishlist_${email}`) {
        setWishlist(storage.getWishlist(email));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [email]);

  const handleRemove = (id: string, name: string) => {
    storage.toggleWishlist(email, id);
    setWishlist(storage.getWishlist(email));
    toast('Removed from wishlist', { description: name });
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto animate-fade-in pb-12">
      <div className="text-center mb-7">
        <p className="font-body text-[10px] uppercase tracking-[0.4em] text-taupe mb-2">Your favorites</p>
        <h1 className="font-display text-3xl font-light italic text-foreground">Wishlist</h1>
        <p className="font-body text-xs text-muted-foreground mt-2 italic">
          {items.length} {items.length === 1 ? 'piece' : 'pieces'} saved
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-14 bg-cream rounded-3xl border border-border/40 shadow-card">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full nude-gradient flex items-center justify-center shadow-soft">
            <Heart size={20} className="text-foreground/70" strokeWidth={1.5} />
          </div>
          <p className="font-display text-xl italic font-light text-foreground mb-1">No saved pieces yet</p>
          <p className="font-body text-xs text-muted-foreground italic mb-5">
            Tap the heart on any wardrobe item to keep it here.
          </p>
          <Link
            to="/wardrobe"
            className="inline-block px-6 py-2.5 rounded-full bg-foreground text-cream font-body text-[11px] uppercase tracking-[0.3em] hover:bg-taupe transition-colors"
          >
            Browse wardrobe
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {items.map(item => (
            <div key={item.id} className="rounded-2xl overflow-hidden bg-cream shadow-card border border-border/40 group">
              <div className="relative">
                <LazyImage
                  src={item.image}
                  alt={item.name || item.type}
                  wrapperClassName="w-full h-40 bg-nude-soft"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <button
                  onClick={() => handleRemove(item.id, item.name || item.type)}
                  aria-label="Remove from wishlist"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-cream/95 backdrop-blur-sm border border-border/50 flex items-center justify-center shadow-soft hover:bg-cream transition-colors"
                >
                  <Heart size={13} className="text-destructive fill-destructive" strokeWidth={1.5} />
                </button>
              </div>
              <div className="p-3">
                <p className="font-display italic text-sm text-foreground truncate">{item.name || item.type}</p>
                <p className="font-body text-[10px] text-muted-foreground capitalize tracking-wider mt-0.5">
                  {item.color} · {item.wornCount}× worn
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
