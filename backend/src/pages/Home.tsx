import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { generateOutfits } from '@/lib/recommendations';
import { getWeather, type WeatherData } from '@/lib/weather';
import { Calendar as CalendarIcon, Plus, MapPin, ChevronLeft, ChevronRight, ChevronDown, ArrowRight } from 'lucide-react';
import LuxuryHero from '@/components/LuxuryHero';
import LazyImage from '@/components/LazyImage';

// Arched "Our Services" trio — a signature reference layout
const SERVICES = [
  {
    title: 'Custom Looks',
    desc: 'Outfits curated from your wardrobe and the season.',
    img: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=600&q=85&auto=format&fit=crop',
    path: '/outfits',
  },
  {
    title: 'Occasion Edits',
    desc: 'A piece for the moment — work, dinner, weekend.',
    img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=85&auto=format&fit=crop',
    path: '/chat',
  },
  {
    title: 'Wardrobe',
    desc: 'A quiet inventory of the pieces you love most.',
    img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=85&auto=format&fit=crop',
    path: '/wardrobe',
  },
];

const ESSENTIALS = [
  { name: 'White Shirt',     img: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&q=80&auto=format&fit=crop' },
  { name: 'Tailored Blazer', img: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80&auto=format&fit=crop' },
  { name: 'Black Dress',     img: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80&auto=format&fit=crop' },
  { name: 'Quality Denim',   img: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80&auto=format&fit=crop' },
  { name: 'Soft Sneakers',   img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80&auto=format&fit=crop' },
];

const TRENDS = [
  { name: 'Quiet Luxury',   img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&q=80&auto=format&fit=crop' },
  { name: 'Old Money',      img: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=500&q=80&auto=format&fit=crop' },
  { name: 'Coastal Chic',   img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=500&q=80&auto=format&fit=crop' },
  { name: 'Minimalist',     img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=80&auto=format&fit=crop' },
  { name: 'Soft Tailoring', img: 'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=500&q=80&auto=format&fit=crop' },
];

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function HomePage() {
  const { user } = useAuth();
  const email = user?.email || '';
  const navigate = useNavigate();
  const [weather, setWeather] = useState<WeatherData>({ temp: 24, condition: 'Clear', code: 0 });
  const [time, setTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const prefs = storage.getPreferences(email);
  const wardrobe = storage.getWardrobe(email);
  const events = storage.getEvents(email);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getWeather(prefs?.location).then(w => { if (!cancelled && w) setWeather(w); });
    return () => { cancelled = true; };
  }, [prefs?.location]);

  const outfits = useMemo(() =>
    generateOutfits(wardrobe, weather, prefs, undefined, 7),
    [wardrobe, weather, prefs]
  );

  const currentMonthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const handleAddEvent = () => {
    if (selectedDate && eventName) {
      storage.addEvent(email, { date: selectedDate, event: eventName, location: eventLocation });
      setShowEventForm(false);
      setEventName('');
      setEventLocation('');
    }
  };

  const formatDate = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${viewYear}-${m}-${d}`;
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const yearRange = Array.from({ length: 12 }, (_, i) => today.getFullYear() - 5 + i);
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const greeting = () => {
    const h = time.getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-12 pb-16">
      {/* Editorial hero */}
      <div className="animate-fade-in">
        <LuxuryHero
          name={`${greeting()},\n${user?.name?.split(' ')[0] || 'there'}`}
          greeting="Today's Atelier"
          weather={weather}
          time={time}
          location={prefs?.location}
        />
      </div>

      {/* "This is what we do" — arched services trio */}
      <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="text-center mb-7">
          <p className="font-body text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-2">
            This is what we do
          </p>
          <h2 className="font-display text-3xl font-light text-foreground italic">Our Atelier</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {SERVICES.map((svc, i) => (
            <button
              key={svc.title}
              onClick={() => navigate(svc.path)}
              className="group flex flex-col items-center text-center animate-fade-in"
              style={{ animationDelay: `${0.15 + i * 0.08}s` }}
            >
              {/* Arched image */}
              <div className="relative w-full aspect-[3/4] arch-full overflow-hidden bg-nude-soft border border-border/40 shadow-soft">
                <LazyImage
                  src={svc.img}
                  alt={svc.title}
                  wrapperClassName="absolute inset-0 w-full h-full"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-cream/10 group-hover:bg-cream/0 transition-colors duration-500" />
              </div>

              {/* Card body */}
              <div className="w-[88%] -mt-6 relative bg-cream rounded-2xl px-4 pt-4 pb-5 shadow-card border border-border/50">
                <h3 className="font-display text-xl font-medium text-foreground italic">{svc.title}</h3>
                <p className="font-body text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                  {svc.desc}
                </p>
                <span className="inline-flex items-center gap-1 mt-3 font-body text-[10px] uppercase tracking-[0.25em] text-taupe group-hover:text-foreground transition-colors">
                  Read more <ArrowRight size={11} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Editorial split — text left, image right */}
      <section className="animate-fade-in" style={{ animationDelay: '0.25s' }}>
        <div className="bg-cream rounded-3xl overflow-hidden shadow-card border border-border/40">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="p-7 sm:p-9 flex flex-col justify-center">
              <p className="font-body text-[10px] uppercase tracking-[0.35em] text-taupe mb-3">
                Remember your loved pieces
              </p>
              <h3 className="font-display text-2xl font-light italic text-foreground leading-snug mb-3">
                Style ideas that last longer.
              </h3>
              <p className="font-body text-xs text-muted-foreground leading-relaxed mb-5">
                Whether you're dressing for the day or planning a moment, VÉRA helps you compose
                quiet, considered looks from the wardrobe you already own.
              </p>
              <button
                onClick={() => navigate('/outfits')}
                className="self-start px-5 py-2.5 rounded-full bg-foreground text-background font-body text-[11px] uppercase tracking-[0.25em] hover:bg-taupe transition-colors"
              >
                Let's go
              </button>
            </div>
            <div className="relative h-56 sm:h-auto arch-bottom sm:arch-full overflow-hidden bg-nude-soft">
              <LazyImage
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&q=85&auto=format&fit=crop"
                alt="Editorial styling"
                wrapperClassName="absolute inset-0 w-full h-full"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Calendar — collapsible, soft */}
      <section className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <button
          onClick={() => setCalendarOpen(o => !o)}
          aria-expanded={calendarOpen}
          className="w-full flex items-center justify-between p-5 bg-cream rounded-2xl shadow-card border border-border/50 hover:shadow-soft transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full nude-gradient flex items-center justify-center flex-shrink-0">
              <CalendarIcon size={17} className="text-foreground/70" />
            </div>
            <div className="text-left">
              <p className="font-display text-base font-medium italic text-foreground">{currentMonthLabel}</p>
              <p className="font-body text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {events.length} {events.length === 1 ? 'event' : 'events'}
              </p>
            </div>
          </div>
          <ChevronDown
            size={18}
            className={`text-muted-foreground transition-transform duration-300 ${calendarOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {calendarOpen && (
          <div className="mt-3 bg-cream rounded-2xl shadow-card p-5 border border-border/50 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <button onClick={goPrevMonth} aria-label="Previous month"
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-nude-soft transition-colors">
                <ChevronLeft size={18} className="text-foreground" />
              </button>
              <button onClick={() => setShowYearPicker(p => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-nude-soft transition-colors">
                <span className="font-display text-base italic font-medium text-foreground">{MONTH_NAMES[viewMonth]}</span>
                <span className="font-body text-sm text-taupe">{viewYear}</span>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showYearPicker ? 'rotate-180' : ''}`} />
              </button>
              <button onClick={goNextMonth} aria-label="Next month"
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-nude-soft transition-colors">
                <ChevronRight size={18} className="text-foreground" />
              </button>
            </div>

            {showYearPicker ? (
              <div className="grid grid-cols-4 gap-2 animate-fade-in">
                {yearRange.map(y => (
                  <button key={y} onClick={() => { setViewYear(y); setShowYearPicker(false); }}
                    className={`py-2 rounded-full font-body text-sm transition-all ${
                      y === viewYear ? 'nude-gradient text-foreground font-medium' : 'hover:bg-nude-soft text-foreground'
                    }`}>
                    {y}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayLabels.map(d => (
                    <div key={d} className="text-center text-[10px] font-body text-muted-foreground tracking-wider py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = formatDate(day);
                    const isToday = isCurrentMonth && day === today.getDate();
                    const hasEvent = events.some(e => e.date === dateStr);
                    const isSelected = selectedDate === dateStr;
                    return (
                      <button
                        key={day}
                        onClick={() => { setSelectedDate(dateStr); setShowEventForm(true); }}
                        className={`relative aspect-square flex items-center justify-center rounded-full text-xs font-body transition-all ${
                          isToday ? 'bg-foreground text-cream font-medium' :
                          isSelected ? 'bg-nude text-foreground font-medium' :
                          'text-foreground hover:bg-nude-soft'
                        }`}
                      >
                        {day}
                        {hasEvent && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-taupe" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {showEventForm && calendarOpen && (
          <div className="mt-3 p-5 bg-cream rounded-2xl border border-border/50 shadow-card animate-scale-in">
            <p className="font-body text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Add event for {selectedDate}</p>
            {storage.getEventForDate(email, selectedDate) && (
              <div className="mb-3 p-2.5 bg-nude-soft rounded-xl border border-nude/40">
                <p className="font-body text-xs text-foreground">📌 {storage.getEventForDate(email, selectedDate)!.event}</p>
              </div>
            )}
            <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Event name"
              className="w-full bg-background border border-border rounded-full px-4 py-2.5 text-foreground font-body text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-taupe/40" />
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={14} className="text-muted-foreground flex-shrink-0" />
              <input value={eventLocation} onChange={e => setEventLocation(e.target.value)} placeholder="Location"
                className="flex-1 bg-background border border-border rounded-full px-4 py-2.5 text-foreground font-body text-sm focus:outline-none focus:ring-1 focus:ring-taupe/40" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowEventForm(false)}
                className="flex-1 py-2.5 rounded-full border border-border text-xs font-body text-muted-foreground hover:bg-nude-soft transition-colors">Cancel</button>
              <button onClick={handleAddEvent} disabled={!eventName.trim()}
                className="flex-1 py-2.5 rounded-full bg-foreground text-cream text-xs font-body uppercase tracking-[0.2em] disabled:opacity-50">
                <Plus size={12} className="inline mr-1" />Add
              </button>
            </div>
          </div>
        )}
      </section>

      {/* See What's Popular — must-have essentials */}
      <section className="animate-fade-in" style={{ animationDelay: '0.35s' }}>
        <div className="text-center mb-6">
          <p className="font-body text-[10px] uppercase tracking-[0.4em] text-taupe mb-2">Wardrobe essentials</p>
          <h2 className="font-display text-2xl font-light italic text-foreground">See what's popular</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {ESSENTIALS.map((item, i) => (
            <div key={i} className="flex-shrink-0 w-32 group cursor-pointer">
              <div className="w-32 h-40 rounded-2xl overflow-hidden bg-nude-soft border border-border/30 shadow-soft">
                <LazyImage
                  src={item.img}
                  alt={item.name}
                  wrapperClassName="w-full h-full"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <p className="font-body text-[11px] text-foreground/80 text-center mt-2.5 italic">{item.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <div className="text-center mb-6">
          <p className="font-body text-[10px] uppercase tracking-[0.4em] text-taupe mb-2">Mood</p>
          <h2 className="font-display text-2xl font-light italic text-foreground">Trending looks</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {TRENDS.map((trend, i) => (
            <div key={i} className="flex-shrink-0 w-36">
              <div className="relative w-36 h-48 rounded-2xl overflow-hidden shadow-soft border border-border/30 group">
                <LazyImage
                  src={trend.img}
                  alt={trend.name}
                  wrapperClassName="w-full h-full"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-cream/90 to-transparent pointer-events-none">
                  <p className="font-display text-sm italic text-foreground">{trend.name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Talk to our staff — closing arch */}
      <section className="animate-fade-in" style={{ animationDelay: '0.45s' }}>
        <div className="relative bg-nude-soft arch-top px-6 pt-12 pb-7 text-center border border-border/40 shadow-soft rounded-b-3xl">
          <p className="font-body text-[10px] uppercase tracking-[0.4em] text-taupe mb-3">Always here</p>
          <h2 className="font-display text-2xl font-light italic text-foreground mb-3">Talk to VÉRA</h2>
          <p className="font-body text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto mb-5">
            Trouble choosing a look? Ask anything — pairings, occasions, colors —
            and VÉRA will guide you, gently.
          </p>
          <button
            onClick={() => navigate('/chat')}
            className="px-6 py-2.5 rounded-full bg-foreground text-background font-body text-[11px] uppercase tracking-[0.25em] hover:bg-taupe transition-colors"
          >
            Let's talk
          </button>
        </div>
      </section>
    </div>
  );
}
