import { useEffect, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { getWishlist, toggleWishlistItem, type CloudWardrobeItem } from '@/lib/cloud';
import { WardrobeItem } from '@/lib/storage';
import { Eye, Trash2, TrendingUp, Sparkles, Heart } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  item: WardrobeItem | null;
  email: string;
  onClose: () => void;
  onWorn: (id: string) => void;
  onDelete: (id: string) => void;
  totalWornInWardrobe: number;
}

export default function ItemDrawer({ item, email, onClose, onWorn, onDelete, totalWornInWardrobe }: Props) {
  const open = !!item;
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    if (open && email) {
      getWishlist(email).then(setWishlist);
    }
  }, [open, email]);

  const sharePct = item && totalWornInWardrobe > 0 ? Math.round((item.wornCount / totalWornInWardrobe) * 100) : 0;
  const status = !item ? '' : item.wornCount === 0 ? 'Never worn' : item.wornCount < 3 ? 'Rarely worn' : item.wornCount < 8 ? 'Loved' : 'Iconic';
  const isSaved = item ? wishlist.includes(item.id) : false;

  const toggleWishlist = () => {
    if (!item) return;
    toggleWishlistItem(email, item.id)
      .then(updatedIds => {
        setWishlist(updatedIds);
        toast(updatedIds.includes(item.id) ? 'Saved to wishlist' : 'Removed from wishlist', {
          description: item.name || item.type,
        });
      })
      .catch(() => {
        toast.error('Failed to update wishlist');
      });
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="bg-cream border-t border-border/50 max-h-[90vh]">
        {item && (
          <>
            <DrawerHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="text-left">
                  <DrawerTitle className="font-display text-2xl italic font-light text-foreground text-left">
                    {item.name || item.type}
                  </DrawerTitle>
                  <p className="font-body text-[10px] text-taupe text-left uppercase tracking-[0.3em] capitalize mt-1">
                    {item.type} · {item.color}
                  </p>
                </div>
                <button
                  onClick={toggleWishlist}
                  aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
                  className="w-10 h-10 rounded-full bg-background border border-border/50 flex items-center justify-center hover:border-taupe/40 transition-colors shrink-0"
                >
                  <Heart
                    size={15}
                    strokeWidth={1.5}
                    className={isSaved ? 'text-destructive fill-destructive' : 'text-taupe'}
                  />
                </button>
              </div>
            </DrawerHeader>

            <div className="px-4 pb-6 overflow-y-auto">
              {/* Arched image */}
              <div className="aspect-[4/5] max-h-[40vh] arch-full overflow-hidden bg-nude-soft shadow-soft border border-border/50 mx-auto mb-5 relative">
                <img src={item.image} alt={item.name || item.type} className="w-full h-full object-contain" />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <StatCard label="Wears" value={item.wornCount.toString()} />
                <StatCard label="Share" value={`${sharePct}%`} />
                <StatCard label="Status" value={status} small />
              </div>

              {/* Wear share */}
              <div className="bg-background border border-border/50 rounded-2xl p-4 mb-4 shadow-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-body text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Wardrobe share</p>
                  <TrendingUp size={11} className="text-taupe" strokeWidth={1.5} />
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full nude-gradient rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(4, sharePct)}%` }}
                  />
                </div>
                <p className="font-body text-[11px] text-muted-foreground mt-2 italic">
                  {item.wornCount === 0
                    ? 'This piece is waiting for its moment.'
                    : `Worn ${item.wornCount} time${item.wornCount === 1 ? '' : 's'} of ${totalWornInWardrobe} total.`}
                </p>
              </div>

              {/* Stylist note */}
              <div className="flex items-start gap-3 bg-nude-soft/60 border border-nude/40 rounded-2xl p-4 mb-5">
                <Sparkles size={14} className="text-taupe shrink-0 mt-0.5" strokeWidth={1.5} />
                <p className="font-body text-xs text-foreground/80 leading-relaxed italic">
                  {item.wornCount === 0
                    ? 'Try styling this piece today — VÉRA can suggest a fresh outfit.'
                    : `A signature ${item.color} ${item.type.toLowerCase()} — pair with neutrals for an effortless look.`}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { onWorn(item.id); onClose(); }}
                  className="flex-1 bg-foreground text-cream font-body py-3 rounded-full text-xs uppercase tracking-[0.3em] hover:bg-taupe transition-colors flex items-center justify-center gap-2"
                >
                  <Eye size={14} strokeWidth={1.5} />
                  Mark worn
                </button>
                <button
                  onClick={() => { onDelete(item.id); onClose(); }}
                  className="px-4 rounded-full bg-background border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Delete item"
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-background border border-border/50 rounded-2xl p-3 text-center shadow-card">
      <p className={`font-display italic font-light text-foreground ${small ? 'text-sm' : 'text-2xl'}`}>{value}</p>
      <p className="font-body text-[9px] text-muted-foreground uppercase tracking-[0.25em] mt-1">{label}</p>
    </div>
  );
}
