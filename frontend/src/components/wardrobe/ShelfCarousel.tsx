import { useRef, useState, useEffect, useCallback } from 'react';
import type { WardrobeItem } from '@/lib/storage';
import { Upload } from 'lucide-react';

interface Props {
  items: WardrobeItem[];
  onSelect: (item: WardrobeItem) => void;
  onUpload: () => void;
}

/**
 * Editorial 3D shelf — soft beige base, arched cards, gentle perspective.
 */
export default function ShelfCarousel({ items, onSelect, onUpload }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const updateMetrics = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setScrollX(el.scrollLeft);
    setContainerWidth(el.clientWidth);
  }, []);

  useEffect(() => {
    updateMetrics();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateMetrics, { passive: true });
    window.addEventListener('resize', updateMetrics);
    return () => {
      el.removeEventListener('scroll', updateMetrics);
      window.removeEventListener('resize', updateMetrics);
    };
  }, [updateMetrics]);

  const CARD_W = 180;
  const GAP = 20;
  const STEP = CARD_W + GAP;
  const center = scrollX + containerWidth / 2;

  if (items.length === 0) {
    return (
      <div className="text-center py-14">
        <div className="mx-auto mb-5 w-20 h-20 rounded-full bg-nude-soft border border-border/50 flex items-center justify-center shadow-soft">
          <Upload size={22} className="text-taupe" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-xl italic font-light text-foreground mb-1">Empty shelf</h3>
        <p className="font-body text-sm text-muted-foreground italic mb-6">Add your first piece to begin</p>
        <button onClick={onUpload} className="px-6 py-2.5 rounded-full bg-foreground text-cream font-body text-xs uppercase tracking-[0.3em] hover:bg-taupe transition-colors">
          <Upload size={12} className="inline mr-2" strokeWidth={1.5} />Upload item
        </button>
      </div>
    );
  }

  return (
    <div className="relative" style={{ perspective: '1400px' }}>
      {/* Soft beige shelf base */}
      <div className="absolute left-0 right-0 bottom-2 h-2.5 rounded-full bg-gradient-to-b from-nude/60 via-beige to-beige-dark/70 shadow-soft" />
      <div className="absolute left-4 right-4 -bottom-1 h-2 rounded-full bg-foreground/10 blur-md" />

      <div
        ref={trackRef}
        className="flex gap-5 overflow-x-auto scrollbar-hide pb-6 pt-4 snap-x snap-mandatory"
        style={{ scrollPaddingInline: `calc(50% - ${CARD_W / 2}px)`, paddingInline: `calc(50% - ${CARD_W / 2}px)`, transformStyle: 'preserve-3d' }}
      >
        {items.map((item, i) => {
          const cardCenter = i * STEP + CARD_W / 2 + (containerWidth / 2 - CARD_W / 2);
          const dist = (cardCenter - center) / STEP;
          const clamped = Math.max(-2.5, Math.min(2.5, dist));
          const rotateY = clamped * -22;
          const translateZ = -Math.abs(clamped) * 60;
          const scale = 1 - Math.min(0.18, Math.abs(clamped) * 0.08);
          const opacity = 1 - Math.min(0.55, Math.abs(clamped) * 0.22);

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="snap-center shrink-0 group"
              style={{
                width: CARD_W,
                transform: `translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                transformStyle: 'preserve-3d',
                transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s',
                opacity,
              }}
            >
              {/* Arched card silhouette */}
              <div className="relative aspect-[3/4] arch-full overflow-hidden bg-nude-soft shadow-arch border border-border/50">
                <img src={item.image} alt={item.name || item.type} className="w-full h-full object-cover" />
                <div className="absolute inset-0 arch-full ring-1 ring-inset ring-nude-deep/20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-cream/95 to-transparent">
                  <p className="font-display italic text-sm text-foreground truncate">{item.name || item.type}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="font-body text-[10px] text-muted-foreground capitalize">{item.color}</p>
                    <p className="font-body text-[10px] text-taupe">{item.wornCount}×</p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
