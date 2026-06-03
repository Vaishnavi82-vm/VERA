import { useState } from 'react';
import { storage, type UserPreferences } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Briefcase, Palette, Shield, Save, Check, type LucideIcon } from 'lucide-react';

export default function Preferences() {
  const { user } = useAuth();
  const email = user?.email || '';
  const existing = storage.getPreferences(email);
  const [location, setLocation] = useState(existing?.location || '');
  const [lifestyle, setLifestyle] = useState<UserPreferences['lifestyle']>(existing?.lifestyle || 'corporate');
  const [style, setStyle] = useState<UserPreferences['style']>(existing?.style || 'elegant');
  const [sleevelessAllowed, setSleevelessAllowed] = useState(existing?.restrictions.sleevelessAllowed ?? true);
  const [shortAllowed, setShortAllowed] = useState(existing?.restrictions.shortOutfitsAllowed ?? true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const prefs: UserPreferences = {
      location, lifestyle, style,
      restrictions: { sleevelessAllowed, shortOutfitsAllowed: shortAllowed },
    };
    storage.setPreferences(email, prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto animate-fade-in pb-12">
      <div className="text-center mb-8">
        <p className="font-body text-[10px] uppercase tracking-[0.4em] text-taupe mb-2">Atelier</p>
        <h1 className="font-display text-3xl font-light italic text-foreground">Preferences</h1>
        <p className="font-body text-xs text-muted-foreground mt-2 italic">Tune VÉRA to your taste</p>
      </div>

      <div className="space-y-4">
        <PreferenceCard icon={MapPin} title="Location">
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Your city"
            className="w-full bg-background border border-border rounded-full px-5 py-3 text-foreground font-body text-sm focus:outline-none focus:ring-1 focus:ring-taupe/40 transition-all"
          />
        </PreferenceCard>

        <PreferenceCard icon={Briefcase} title="Lifestyle">
          <div className="flex gap-2">
            {(['student', 'corporate', 'other'] as const).map(l => (
              <ChoiceChip key={l} active={lifestyle === l} onClick={() => setLifestyle(l)} label={l} />
            ))}
          </div>
        </PreferenceCard>

        <PreferenceCard icon={Palette} title="Style">
          <div className="grid grid-cols-2 gap-2">
            {(['casual', 'elegant', 'trendy', 'minimal'] as const).map(s => (
              <ChoiceChip key={s} active={style === s} onClick={() => setStyle(s)} label={s} />
            ))}
          </div>
        </PreferenceCard>

        <PreferenceCard icon={Shield} title="Care">
          {[
            { label: 'Sleeveless outfits', value: sleevelessAllowed, onChange: setSleevelessAllowed },
            { label: 'Short outfits', value: shortAllowed, onChange: setShortAllowed },
          ].map((t, i, arr) => (
            <div key={t.label}>
              <div className="flex items-center justify-between py-3">
                <span className="font-body text-sm text-foreground">{t.label}</span>
                <button
                  onClick={() => t.onChange(!t.value)}
                  className={`w-12 h-7 rounded-full transition-all relative ${t.value ? 'bg-foreground' : 'bg-muted'}`}
                  aria-pressed={t.value}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-cream shadow-sm transition-all duration-300 ${t.value ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              {i < arr.length - 1 && <div className="h-px bg-border/40" />}
            </div>
          ))}
        </PreferenceCard>

        <button
          onClick={handleSave}
          className={`w-full flex items-center justify-center gap-2 font-body py-3.5 rounded-full text-xs uppercase tracking-[0.3em] transition-all ${
            saved ? 'bg-nude text-foreground' : 'bg-foreground text-cream hover:bg-taupe'
          }`}
        >
          {saved ? <><Check size={14} />Saved</> : <><Save size={14} />Save preferences</>}
        </button>
      </div>
    </div>
  );
}

function PreferenceCard({
  icon: Icon, title, children,
}: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-cream rounded-3xl p-6 border border-border/40 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={13} className="text-taupe" strokeWidth={1.5} />
        <h3 className="font-body text-[10px] uppercase tracking-[0.3em] text-taupe">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ChoiceChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-full text-xs font-body capitalize transition-all duration-300 ${
        active
          ? 'bg-foreground text-cream'
          : 'bg-background border border-border text-foreground hover:border-taupe/40'
      }`}
    >
      {label}
    </button>
  );
}
