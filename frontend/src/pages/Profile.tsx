import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPreferences, listOutfits, listWardrobe, getWishlist, type CloudPreferences, type CloudOutfit, type CloudWardrobeItem } from '@/lib/cloud';
import { Settings, LogOut, Heart, Shirt, Sparkles, Camera, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import LazyImage from '@/components/LazyImage';

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const email = user?.email || '';
  const [prefs, setPrefs] = useState<CloudPreferences | null>(null);
  const [wardrobe, setWardrobe] = useState<CloudWardrobeItem[]>([]);
  const [outfits, setOutfits] = useState<CloudOutfit[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      setPrefs(null);
      setWardrobe([]);
      setOutfits([]);
      setWishlist([]);
      return;
    }

    setLoading(true);
    Promise.all([
      getPreferences(email),
      listWardrobe(email),
      listOutfits(email, { limit: 12 }),
      getWishlist(email),
    ])
      .then(([loadedPrefs, loadedWardrobe, loadedOutfits, wishlistIds]) => {
        setPrefs(loadedPrefs);
        setWardrobe(loadedWardrobe);
        setOutfits(loadedOutfits);
        setWishlist(wishlistIds);
      })
      .catch(() => {
        toast.error('Could not load profile data');
      })
      .finally(() => setLoading(false));
  }, [email]);

  const initial = user?.name?.charAt(0).toUpperCase() || 'V';
  const avatar = user?.avatar;

  const handlePickPhoto = () => fileRef.current?.click();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image must be under 4MB');
      return;
    }
    setUploading(true);
    // Resize/compress to 512×512 for snappy storage
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { setUploading(false); return; }
        // Cover-fit crop
        const ratio = Math.max(size / img.width, size / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        // TODO: Store avatar in MongoDB via backend API
        refreshUser();
        toast.success('Profile photo updated');
        setUploading(false);
      };
      img.onerror = () => { toast.error('Could not read that image'); setUploading(false); };
      img.src = reader.result as string;
    };
    reader.onerror = () => { toast.error('Could not read that file'); setUploading(false); };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    // TODO: Remove avatar from MongoDB via backend API
    refreshUser();
    toast('Photo removed');
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto animate-fade-in pb-12 space-y-6">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* Editorial hero card with arched image */}
      <div className="relative bg-cream rounded-3xl overflow-hidden shadow-arch border border-border/40">
        {/* Top arched portrait area */}
        <div className="relative h-44 nude-gradient overflow-hidden">
          <LazyImage
            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=85&auto=format&fit=crop"
            alt=""
            wrapperClassName="absolute inset-0 w-full h-full"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-cream/0 to-cream pointer-events-none" />
        </div>

        <div className="relative -mt-14 px-6 pb-7 flex flex-col items-center text-center">
          {/* Avatar disc with photo upload */}
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-cream border border-border/60 shadow-soft flex items-center justify-center overflow-hidden">
              {avatar ? (
                <img src={avatar} alt={user?.name || 'You'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full nude-gradient flex items-center justify-center">
                  <span className="font-display text-3xl italic font-medium text-foreground">{initial}</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-cream/70 backdrop-blur-sm flex items-center justify-center">
                  <span className="font-body text-[9px] uppercase tracking-[0.3em] text-foreground animate-pulse">…</span>
                </div>
              )}
            </div>
            {/* Camera button */}
            <button
              onClick={handlePickPhoto}
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-foreground text-cream border-2 border-cream flex items-center justify-center shadow-arch hover:bg-taupe transition-colors active:scale-95"
            >
              <Camera size={14} strokeWidth={1.6} />
            </button>
            {avatar && (
              <button
                onClick={handleRemovePhoto}
                aria-label="Remove profile photo"
                className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-cream text-destructive border border-border/60 flex items-center justify-center shadow-soft hover:bg-destructive/10 transition-colors active:scale-95"
              >
                <Trash2 size={12} strokeWidth={1.6} />
              </button>
            )}
          </div>

          <p className="font-body text-[10px] uppercase tracking-[0.4em] text-taupe mb-1.5">VÉRA · Member</p>
          <h1 className="font-display text-3xl font-light italic text-foreground">{user?.name}</h1>
          <p className="font-body text-[11px] text-muted-foreground mt-1">{user?.email}</p>

          <div className="h-px w-12 bg-nude-deep/50 my-4" />

          {prefs?.style && (
            <p className="font-body text-[10px] uppercase tracking-[0.3em] text-taupe">
              {prefs.style} · {prefs.lifestyle}
            </p>
          )}

          <button
            onClick={handlePickPhoto}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-background hover:bg-nude-soft transition-colors font-body text-[11px] uppercase tracking-[0.25em] text-foreground/80"
          >
            <Camera size={12} strokeWidth={1.6} className="text-taupe" />
            {avatar ? 'Change photo' : 'Add photo'}
          </button>
        </div>
      </div>

      {/* Stat trio */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pieces', value: wardrobe.length, icon: Shirt },
          { label: 'Looks', value: outfits.length, icon: Sparkles },
          { label: 'Saved', value: wishlist.length, icon: Heart },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-cream rounded-2xl p-4 text-center border border-border/40 shadow-card">
              <Icon size={14} className="text-taupe mx-auto mb-2" strokeWidth={1.5} />
              <p className="font-display text-2xl font-light italic text-foreground">{stat.value}</p>
              <p className="font-body text-[9px] text-muted-foreground uppercase tracking-[0.2em] mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Style profile */}
      {prefs && (
        <div className="bg-cream rounded-3xl p-6 border border-border/40 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-body text-[10px] uppercase tracking-[0.3em] text-taupe">Style profile</p>
              <h2 className="font-display text-xl italic font-light text-foreground mt-1">Your taste</h2>
            </div>
            <Link to="/preferences" className="font-body text-[10px] uppercase tracking-[0.25em] text-foreground italic hover:text-taupe transition-colors">
              Edit
            </Link>
          </div>
          <div>
            {[
              { label: 'Location', value: prefs.location || '—' },
              { label: 'Lifestyle', value: prefs.lifestyle },
              { label: 'Style', value: prefs.style },
              { label: 'Sleeveless', value: prefs.restrictions.sleevelessAllowed ? 'Allowed' : 'Not allowed' },
              { label: 'Short outfits', value: prefs.restrictions.shortOutfitsAllowed ? 'Allowed' : 'Not allowed' },
            ].map((item, i, arr) => (
              <div key={item.label}>
                <div className="flex justify-between items-center py-3">
                  <span className="font-body text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</span>
                  <span className="font-display text-sm italic text-foreground capitalize">{item.value}</span>
                </div>
                {i < arr.length - 1 && <div className="h-px bg-border/50" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action row */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/preferences" className="bg-cream rounded-full p-4 border border-border/40 shadow-card flex items-center justify-center gap-2.5 hover:bg-nude-soft transition-colors">
          <Settings size={15} className="text-taupe" strokeWidth={1.5} />
          <span className="font-body text-xs text-foreground tracking-wide">Preferences</span>
        </Link>
        <button onClick={() => logout()} className="bg-cream rounded-full p-4 border border-border/40 shadow-card flex items-center justify-center gap-2.5 hover:bg-destructive/5 transition-colors">
          <LogOut size={15} className="text-destructive" strokeWidth={1.5} />
          <span className="font-body text-xs text-foreground tracking-wide">Sign out</span>
        </button>
      </div>
    </div>
  );
}
