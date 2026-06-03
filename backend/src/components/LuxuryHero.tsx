import type { WeatherData } from '@/lib/weather';
import { MapPin } from 'lucide-react';
import LazyImage from './LazyImage';

type Props = {
  name: string;
  greeting: string;
  weather: WeatherData;
  time: Date;
  location?: string;
};

/**
 * Editorial full-bleed hero — large still-life fashion image, soft cream wash,
 * serif headline, and a discreet weather plate. Calm, magazine-style first impression.
 */
export default function LuxuryHero({ name, greeting, weather, time, location }: Props) {
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="relative w-full rounded-[2rem] overflow-hidden shadow-arch border border-border/60 bg-cream">
      {/* Editorial image */}
      <div className="relative h-[420px] w-full overflow-hidden">
        <LazyImage
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=85&auto=format&fit=crop"
          alt="Editorial fashion still life"
          eager
          wrapperClassName="absolute inset-0 w-full h-full"
          className="w-full h-full object-cover"
        />

        {/* Soft cream wash to keep type legible */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, hsl(var(--cream) / 0.55) 0%, hsl(var(--cream) / 0.15) 35%, hsl(var(--cream) / 0.0) 60%, hsl(var(--espresso) / 0.30) 100%)',
          }}
        />

        {/* Top monogram */}
        <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
          <span className="font-display text-[11px] tracking-[0.45em] text-foreground/80">
            VÉRA · ATELIER
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream/80 backdrop-blur-md border border-border/40">
            <MapPin size={11} className="text-taupe" />
            <span className="font-body text-[10px] uppercase tracking-[0.18em] text-foreground/80">
              {location || weather.city || 'Locating…'}
            </span>
          </div>
        </div>

        {/* Editorial headline anchored center */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center">
          <p className="font-body text-[10px] uppercase tracking-[0.4em] text-foreground/65 mb-3">
            {greeting}
          </p>
          <h1 className="font-display font-light text-[2.6rem] leading-[1.05] text-foreground tracking-tight">
            {name}
          </h1>
          <div className="mx-auto mt-4 h-px w-12 bg-nude-deep/50" />
        </div>
      </div>

      {/* Weather + time editorial plate */}
      <div className="relative bg-cream-gradient px-6 py-5 flex items-center justify-between border-t border-border/50">
        <div>
          <p className="font-body text-[9px] uppercase tracking-[0.35em] text-muted-foreground">
            Today
          </p>
          <p className="font-display text-2xl font-light text-foreground mt-0.5">
            {weather.temp}° <span className="text-muted-foreground/70 text-base italic font-normal">{weather.condition.toLowerCase()}</span>
          </p>
        </div>

        <div className="text-right">
          <p className="font-body text-[9px] uppercase tracking-[0.35em] text-muted-foreground">
            Local time
          </p>
          <p className="font-display text-2xl font-light text-foreground mt-0.5">{timeStr}</p>
        </div>
      </div>
    </div>
  );
}
