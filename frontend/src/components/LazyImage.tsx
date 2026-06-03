import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Eagerly load (skip IntersectionObserver). Use for above-the-fold heroes. */
  eager?: boolean;
  /** Aspect-ratio container className (must define width/height). */
  wrapperClassName?: string;
  /** Skeleton tone — defaults to nude-soft. */
  skeletonClassName?: string;
}

// In-memory hint so the same URL doesn't re-skeleton across navigations.
const decoded = new Set<string>();

/**
 * LazyImage — IntersectionObserver-driven, with shimmer skeleton + fade-in.
 * Use for all curated Unsplash imagery to keep first paint smooth on mobile.
 */
export default function LazyImage({
  src,
  alt,
  eager = false,
  className,
  wrapperClassName,
  skeletonClassName,
  ...rest
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(eager);
  const [loaded, setLoaded] = useState(decoded.has(src));

  useEffect(() => {
    if (eager || inView) return;
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px 0px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, inView]);

  return (
    <div
      ref={wrapperRef}
      className={cn('relative overflow-hidden', wrapperClassName)}
    >
      {!loaded && (
        <div
          aria-hidden
          className={cn(
            'absolute inset-0 animate-pulse bg-nude-soft',
            skeletonClassName
          )}
        />
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => {
            decoded.add(src);
            setLoaded(true);
          }}
          className={cn(
            'transition-opacity duration-700 ease-out',
            loaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          {...rest}
        />
      )}
    </div>
  );
}
