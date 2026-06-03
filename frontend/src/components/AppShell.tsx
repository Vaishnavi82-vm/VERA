import { useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, ShirtIcon, Sparkles, MessageCircle, Menu, Heart, X, User, Settings, Mail, Star, LogOut } from 'lucide-react';

const SWIPE_ROUTES = ['/', '/wardrobe', '/outfits', '/chat'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const elapsed = Date.now() - start.t;
    if (elapsed > 600) return;
    if (Math.abs(dx) < 70) return;
    if (Math.abs(dy) > Math.abs(dx) * 0.6) return;
    const idx = SWIPE_ROUTES.indexOf(location.pathname);
    if (idx === -1) return;
    const nextIdx = dx < 0 ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= SWIPE_ROUTES.length) return;
    navigate(SWIPE_ROUTES[nextIdx]);
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/wardrobe', icon: ShirtIcon, label: 'Wardrobe' },
    { path: '/outfits', icon: Sparkles, label: 'Outfits' },
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
  ];

  const menuItems = [
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Settings, label: 'Preferences', path: '/preferences' },
    { icon: Mail, label: 'Contact', path: '/contact' },
    { icon: Star, label: 'Reviews', path: '/reviews' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Top Bar — soft cream, serif wordmark */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-cream/85 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-5 h-14">
          <button
            onClick={() => setSideMenuOpen(true)}
            aria-label="Open menu"
            className="p-2 text-foreground/80 hover:text-foreground transition-colors"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <Link to="/" className="font-display text-2xl font-medium italic tracking-wide text-foreground">
            Véra
          </Link>
          <Link
            to="/wishlist"
            aria-label="Wishlist"
            className="p-2 text-foreground/80 hover:text-foreground transition-colors"
          >
            <Heart size={18} strokeWidth={1.5} />
          </Link>
        </div>
      </header>

      {/* Side menu */}
      {sideMenuOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-foreground/15 backdrop-blur-sm" onClick={() => setSideMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-cream border-r border-border/40 shadow-arch animate-slide-in-left">
            <div className="p-7">
              <div className="flex items-center justify-between mb-9">
                <h2 className="font-display text-2xl font-medium italic text-foreground">Véra</h2>
                <button
                  onClick={() => setSideMenuOpen(false)}
                  aria-label="Close menu"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              {user && (
                <div className="mb-8 pb-6 border-b border-border/50">
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-border/60 shadow-soft mb-3">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full nude-gradient flex items-center justify-center">
                        <span className="font-display font-medium italic text-xl text-foreground">{user.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <p className="font-display text-base italic text-foreground">{user.name}</p>
                  <p className="font-body text-[11px] text-muted-foreground tracking-wide">{user.email}</p>
                </div>
              )}

              <nav className="space-y-0.5">
                {menuItems.map(item => (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-full text-sm font-body text-foreground/85 hover:bg-nude-soft hover:text-foreground transition-colors"
                  >
                    <item.icon size={16} strokeWidth={1.5} />
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={() => { logout(); setSideMenuOpen(false); }}
                  className="flex items-center gap-3 px-3 py-3 rounded-full text-sm font-body text-destructive hover:bg-destructive/10 transition-colors w-full"
                >
                  <LogOut size={16} strokeWidth={1.5} />
                  Logout
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 pt-14 pb-20">
        {children}
      </main>

      {/* Bottom nav — soft pill */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-xl border-t border-border/40">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
                }`}
              >
                <item.icon size={19} strokeWidth={active ? 1.8 : 1.4} />
                <span className={`text-[10px] font-body tracking-wide ${active ? 'italic font-medium' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
