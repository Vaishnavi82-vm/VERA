import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import LazyImage from '@/components/LazyImage';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const err = await login(email, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      <div className="absolute inset-0">
        <LazyImage
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80&auto=format&fit=crop"
          alt="" eager
          wrapperClassName="absolute inset-0 w-full h-full"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-cream/70 pointer-events-none" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-10">
          <p className="font-body text-[10px] uppercase tracking-[0.45em] text-taupe mb-3">Personal styling atelier</p>
          <h1 className="font-display text-5xl font-light italic text-foreground">Véra</h1>
          <div className="mx-auto mt-4 h-px w-12 bg-nude-deep/50" />
          <p className="font-body text-xs text-muted-foreground mt-4 italic">Welcome back</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-cream/85 backdrop-blur-md rounded-3xl p-7 border border-border/40 shadow-arch">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-2xl p-3 text-center animate-scale-in font-body">{error}</div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-body uppercase tracking-[0.25em] text-muted-foreground">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-background border border-border rounded-full px-5 py-3 text-foreground font-body text-sm focus:outline-none focus:ring-1 focus:ring-taupe/40 transition-all"
              placeholder="your@email.com" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-body uppercase tracking-[0.25em] text-muted-foreground">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-background border border-border rounded-full px-5 py-3 pr-12 text-foreground font-body text-sm focus:outline-none focus:ring-1 focus:ring-taupe/40 transition-all"
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-foreground text-cream font-body py-3 rounded-full uppercase tracking-[0.3em] text-xs hover:bg-taupe transition-colors disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-7 font-body">
          New here? <Link to="/signup" className="text-foreground italic hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
