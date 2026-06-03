import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { savePreferences } from '@/lib/cloud';
import { MapPin, Briefcase, Palette, Shield, ChevronRight, ChevronLeft, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const steps = [
  { key: 'Location', icon: MapPin },
  { key: 'Lifestyle', icon: Briefcase },
  { key: 'Style', icon: Palette },
  { key: 'Care', icon: Shield },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState('');
  const [lifestyle, setLifestyle] = useState<'student' | 'corporate' | 'other'>('corporate');
  const [style, setStyle] = useState<'casual' | 'elegant' | 'trendy' | 'minimal'>('elegant');
  const [sleevelessAllowed, setSleevelessAllowed] = useState(true);
  const [shortAllowed, setShortAllowed] = useState(true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user, markOnboarded } = useAuth();
  const navigate = useNavigate();

  const locationError = touched && step === 0 && !location.trim() ? 'Please share your city.' : '';
  const canAdvance = step === 0 ? location.trim().length >= 2 : true;

  const next = () => {
    setTouched(true);
    if (!canAdvance) return;
    setTouched(false);
    if (step < 3) setStep(step + 1); else finish();
  };
  const back = () => { setTouched(false); if (step > 0) setStep(step - 1); };

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await savePreferences(user.id, {
        location: location.trim(), lifestyle, style,
        sleeveless_allowed: sleevelessAllowed, short_outfits_allowed: shortAllowed,
      });
      await markOnboarded();
      toast.success('Welcome to VÉRA', { description: 'Your atelier is ready.' });
      navigate('/');
    } catch (e) {
      toast.error('Could not save preferences', { description: (e as Error).message });
      setSaving(false);
    }
  };

  const lifestyleOptions = [
    { value: 'student' as const, label: 'Student', desc: 'Campus & social' },
    { value: 'corporate' as const, label: 'Corporate', desc: 'Office & professional' },
    { value: 'other' as const, label: 'Other', desc: 'Freelance, creative & more' },
  ];
  const styleOptions = [
    { value: 'casual' as const, label: 'Casual', desc: 'Relaxed' },
    { value: 'elegant' as const, label: 'Elegant', desc: 'Refined' },
    { value: 'trendy' as const, label: 'Trendy', desc: 'Forward' },
    { value: 'minimal' as const, label: 'Minimal', desc: 'Pared back' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <p className="font-body text-[10px] uppercase tracking-[0.4em] text-taupe mb-2">Step {step + 1} of {steps.length}</p>
          <h1 className="font-display text-3xl font-light italic text-foreground">Style assessment</h1>
          <p className="font-body text-xs text-muted-foreground mt-2 italic">{steps[step].key} · help VÉRA understand your taste</p>
        </div>

        <div className="mb-9">
          <div className="flex justify-center gap-2 mb-3">
            {steps.map((s, i) => (
              <div key={s.key} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-foreground' : i < step ? 'w-4 bg-nude-deep' : 'w-4 bg-border'}`} />
            ))}
          </div>
          <div className="h-px bg-border/50 mx-auto max-w-[80%]">
            <div className="h-full bg-foreground/70 transition-all duration-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </div>

        <div className="bg-cream rounded-3xl p-7 border border-border/40 shadow-card min-h-[320px]">
          {step === 0 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <Icon><MapPin size={20} className="text-foreground/70" strokeWidth={1.5} /></Icon>
                <h2 className="font-display text-xl italic text-foreground">Where are you?</h2>
                <p className="font-body text-[11px] text-muted-foreground mt-1.5">For weather-aware looks</p>
              </div>
              <div>
                <input value={location} onChange={e => { setLocation(e.target.value); if (touched) setTouched(false); }}
                  onBlur={() => setTouched(true)} placeholder="New York, London, Mumbai…" aria-invalid={!!locationError}
                  className={`w-full bg-background border rounded-full px-5 py-3 text-foreground font-body text-sm focus:outline-none focus:ring-1 transition-all ${
                    locationError ? 'border-destructive/60 focus:ring-destructive/30' : 'border-border focus:ring-taupe/40'
                  }`} />
                {locationError && (
                  <div className="flex items-center gap-1.5 mt-2 px-2 animate-fade-in">
                    <AlertCircle size={11} className="text-destructive shrink-0" />
                    <p className="font-body text-[11px] text-destructive italic">{locationError}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3 animate-fade-in">
              <div className="text-center mb-4"><Icon><Briefcase size={20} className="text-foreground/70" strokeWidth={1.5} /></Icon>
                <h2 className="font-display text-xl italic text-foreground">Your lifestyle</h2>
              </div>
              {lifestyleOptions.map(l => (
                <button key={l.value} onClick={() => setLifestyle(l.value)}
                  className={`w-full flex items-center justify-between py-3.5 px-5 rounded-full border font-body text-sm transition-all ${
                    lifestyle === l.value ? 'border-foreground bg-foreground text-cream' : 'border-border bg-background text-foreground hover:border-taupe/40'
                  }`}>
                  <span className="font-display italic text-base">{l.label}</span>
                  <span className={`text-[10px] uppercase tracking-[0.2em] ${lifestyle === l.value ? 'text-cream/70' : 'text-muted-foreground'}`}>{l.desc}</span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <div className="text-center mb-4"><Icon><Palette size={20} className="text-foreground/70" strokeWidth={1.5} /></Icon>
                <h2 className="font-display text-xl italic text-foreground">Your style</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {styleOptions.map(s => (
                  <button key={s.value} onClick={() => setStyle(s.value)}
                    className={`flex flex-col items-center gap-1 py-5 px-4 rounded-2xl border font-body transition-all ${
                      style === s.value ? 'border-foreground bg-foreground text-cream' : 'border-border bg-background text-foreground hover:border-taupe/40'
                    }`}>
                    <p className="font-display italic text-lg">{s.label}</p>
                    <p className={`text-[10px] uppercase tracking-[0.2em] ${style === s.value ? 'text-cream/70' : 'text-muted-foreground'}`}>{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 animate-fade-in">
              <div className="text-center mb-4"><Icon><Shield size={20} className="text-foreground/70" strokeWidth={1.5} /></Icon>
                <h2 className="font-display text-xl italic text-foreground">Care notes</h2>
                <p className="font-body text-[11px] text-muted-foreground mt-1.5">We'll respect these in suggestions</p>
              </div>
              {[
                { label: 'Sleeveless outfits', value: sleevelessAllowed, onChange: setSleevelessAllowed },
                { label: 'Short outfits', value: shortAllowed, onChange: setShortAllowed },
              ].map(t => (
                <div key={t.label} className="flex items-center justify-between py-4 px-5 rounded-full border border-border bg-background">
                  <span className="font-body text-sm text-foreground">{t.label}</span>
                  <button onClick={() => t.onChange(!t.value)}
                    className={`w-12 h-7 rounded-full transition-all relative ${t.value ? 'bg-foreground' : 'bg-muted'}`} aria-pressed={t.value}>
                    <span className={`absolute top-1 w-5 h-5 rounded-full bg-cream shadow-sm transition-all duration-300 ${t.value ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-7">
          {step > 0 && (
            <button onClick={back} className="flex items-center justify-center gap-1 flex-1 border border-border py-3 rounded-full font-body text-xs text-muted-foreground hover:bg-cream transition-colors uppercase tracking-[0.25em]">
              <ChevronLeft size={14} /> Back
            </button>
          )}
          <button onClick={next} disabled={(step === 0 && !location.trim()) || saving}
            className="flex items-center justify-center gap-1 flex-1 bg-foreground text-cream font-body py-3 rounded-full uppercase tracking-[0.3em] text-xs hover:bg-taupe transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : (step === 3 ? 'Complete' : 'Continue')}
            {!saving && step < 3 && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return <div className="w-14 h-14 rounded-full nude-gradient flex items-center justify-center mx-auto mb-3 shadow-soft">{children}</div>;
}
