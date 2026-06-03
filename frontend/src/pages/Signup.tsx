import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import LazyImage from '@/components/LazyImage';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const passwordChecks = [
    { label: 'At least 6 characters', ok: password.length >= 6 },
    { label: 'Passwords match', ok: password.length > 0 && password === confirm },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    const err = await signup(name, email, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      navigate('/onboarding');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      <div className="absolute inset-0">
        <LazyImage src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&q=80&auto=format&fit=crop"
          alt="" eager wrapperClassName="absolute inset-0 w-full h-full" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-cream/70 pointer-events-none" />
      </div>
      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <p className="font-body text-[10px] uppercase tracking-[0.45em] text-taupe mb-3">Begin your atelier</p>
          <h1 className="font-display text-5xl font-light italic text-foreground">Véra</h1>
          <div className="mx-auto mt-4 h-px w-12 bg-nude-deep/50" />
          <p className="font-body text-xs text-muted-foreground mt-4 italic">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 bg-cream/85 backdrop-blur-md rounded-3xl p-7 border border-border/40 shadow-arch">
          {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-2xl p-3 text-center animate-scale-in font-body">{error}</div>}
          <Field label="Name"><input type="text" value={name} onChange={e => setName(e.target.value)} required className={INPUT} placeholder="Your name" /></Field>
          <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={INPUT} placeholder="your@email.com" /></Field>
          <Field label="Password">
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required className={`${INPUT} pr-12`} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          <Field label="Confirm password"><input type={showPassword ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required className={INPUT} placeholder="••••••••" /></Field>
          {password.length > 0 && (
            <div className="space-y-1 pt-1">
              {passwordChecks.map(c => (
                <div key={c.label} className="flex items-center gap-2">
                  {c.ok ? <Check size={11} className="text-taupe" /> : <X size={11} className="text-muted-foreground" />}
                  <span className={`font-body text-[11px] ${c.ok ? 'text-taupe italic' : 'text-muted-foreground'}`}>{c.label}</span>
                </div>
              ))}
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full bg-foreground text-cream font-body py-3 rounded-full uppercase tracking-[0.3em] text-xs hover:bg-taupe transition-colors disabled:opacity-60 mt-2">
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-7 font-body">
          Already a member? <Link to="/login" className="text-foreground italic hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const INPUT = 'w-full bg-background border border-border rounded-full px-5 py-3 text-foreground font-body text-sm focus:outline-none focus:ring-1 focus:ring-taupe/40 transition-all';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-body uppercase tracking-[0.25em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
