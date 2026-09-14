/**
 * TopRatedSlider
 * ─────────────────────────────────────────────────────────────────────────
 * A fully responsive scroll-snap carousel that showcases the highest-rated
 * orchard listings.  No external carousel library required — built with
 * native CSS scroll-snap, Tailwind utility classes, and the project's own
 * design tokens.
 *
 * Props
 * ─────
 * orchards   – Orchard[]  Raw array; component sorts by ratingAverage desc.
 * title      – string?    Section heading (default: "Top Rated Orchards")
 * subtitle   – string?    Optional sub-heading below the title
 * maxItems   – number?    Cap on how many items to show (default: 12)
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPin, Star, Trees, Leaf } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { orchardSurface } from '@/lib/gradients';
import type { Orchard } from '@/types';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Render up to 5 filled / half / empty stars */
function StarRow({ value, count }: { value: number; count: number }) {
  return (
    <span className="flex items-center gap-1.5">
      {/* coloured star icon */}
      <span className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => {
          const filled = value >= i + 1;
          const half = !filled && value >= i + 0.5;
          return (
            <Star
              key={i}
              className={cn(
                'h-[11px] w-[11px] transition-colors',
                filled || half ? 'fill-gold text-gold' : 'fill-sand text-sand'
              )}
            />
          );
        })}
      </span>
      <span className="text-[12.5px] font-bold text-ink">{value.toFixed(1)}</span>
      <span className="text-[11.5px] text-faint">
        ({count} {count === 1 ? 'review' : 'reviews'})
      </span>
    </span>
  );
}

/** Rank badge — 🥇 🥈 🥉 or numeric */
function RankBadge({ rank }: { rank: number }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  return (
    <span
      className={cn(
        'absolute left-3 top-3 z-10 flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-[11.5px] font-black leading-none',
        rank <= 3
          ? 'bg-cream/95 text-ink shadow-soft backdrop-blur-sm'
          : 'bg-[rgba(20,30,15,.55)] text-cream/90 backdrop-blur-sm'
      )}
    >
      {medal ?? `#${rank}`}
    </span>
  );
}

// ─── slider card ─────────────────────────────────────────────────────────────

interface SliderCardProps {
  orchard: Orchard;
  rank: number;
}

function SliderCard({ orchard, rank }: SliderCardProps) {
  const surface = orchardSurface(orchard.thumbnail, orchard.fruitTypes, orchard._id);
  const rentLabel = orchard.rentType?.startsWith('per')
    ? orchard.rentType
    : `per ${orchard.rentType}`;

  return (
    <Link
      to={`/orchards/${orchard.slug}`}
      id={`top-rated-card-${orchard._id}`}
      aria-label={`View ${orchard.gardenName} — rated ${orchard.ratingAverage.toFixed(1)}`}
      className="group relative flex flex-none snap-start flex-col overflow-hidden rounded-2xl border border-sand bg-cream shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
      style={{ scrollSnapAlign: 'start' }}
    >
      {/* ── Image / gradient hero ── */}
      <div className="relative h-[185px] flex-none overflow-hidden" style={surface}>
        {/* overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(20,30,15,.05)] to-[rgba(20,30,15,.48)]" />

        {/* rank badge */}
        <RankBadge rank={rank} />

        {/* availability chip */}
        <span
          className={cn(
            'absolute right-3 top-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide',
            orchard.available
              ? 'bg-avail text-forest'
              : 'bg-[#efe7df] text-[#9a7b5a]'
          )}
        >
          {orchard.available ? 'Available' : 'Booked'}
        </span>

        {/* fruit type watermark */}
        {orchard.fruitTypes[0] && (
          <span className="absolute bottom-3 left-3 z-10 text-[10px] font-bold uppercase tracking-[.12em] text-cream/80">
            {orchard.fruitTypes[0]}
          </span>
        )}

        {/* featured ribbon */}
        {orchard.isFeatured && (
          <span className="absolute bottom-3 right-3 z-10 rounded-full bg-gold px-2 py-0.5 text-[10.5px] font-bold text-cream">
            Featured
          </span>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        {/* name + quick star */}
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-serif text-[15.5px] font-semibold leading-snug text-ink group-hover:text-forest transition-colors">
            {orchard.gardenName}
          </h3>
          {orchard.ratingCount > 0 && (
            <span className="mt-0.5 flex flex-none items-center gap-1 rounded-full bg-[#fdf8ee] px-2 py-0.5 text-[12px] font-bold text-ink ring-1 ring-gold/30">
              <Star className="h-3 w-3 fill-gold text-gold" />
              {orchard.ratingAverage.toFixed(1)}
            </span>
          )}
        </div>

        {/* location */}
        <p className="mb-2 flex items-center gap-1 text-[12px] text-faint">
          <MapPin className="h-3 w-3 flex-none" />
          <span className="truncate">
            {orchard.district}, {orchard.state}
          </span>
        </p>

        {/* star row (detailed) */}
        {orchard.ratingCount > 0 ? (
          <div className="mb-3">
            <StarRow value={orchard.ratingAverage} count={orchard.ratingCount} />
          </div>
        ) : (
          <p className="mb-3 text-[11.5px] italic text-faint">No reviews yet</p>
        )}

        {/* quick stats */}
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-[11px] font-medium text-sub">
            <Trees className="h-3 w-3 text-forest" />
            {orchard.totalTrees.toLocaleString()} trees
          </span>
          {orchard.fruitTypes.slice(0, 2).map((f) => (
            <span
              key={f}
              className="flex items-center gap-1 rounded-full bg-avail px-2.5 py-1 text-[11px] font-medium text-forest"
            >
              <Leaf className="h-3 w-3" />
              {f}
            </span>
          ))}
        </div>

        {/* price footer */}
        <div className="mt-auto flex items-baseline justify-between border-t border-chip pt-3">
          <span>
            <b className="font-serif text-[18px] text-terra">{formatCurrency(orchard.price)}</b>{' '}
            <span className="text-xs text-faint">{rentLabel}</span>
          </span>
          <span className="text-[11px] text-faint">
            {orchard.totalArea} {orchard.areaUnit}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── skeleton card ───────────────────────────────────────────────────────────

function SliderCardSkeleton() {
  return (
    <div className="flex flex-none snap-start flex-col overflow-hidden rounded-2xl border border-sand bg-cream shadow-soft">
      <div className="sk h-[185px] flex-none" />
      <div className="space-y-3 p-4">
        <div className="sk h-4 w-4/5 rounded" />
        <div className="sk h-3 w-1/2 rounded" />
        <div className="sk h-3 w-3/5 rounded" />
        <div className="sk h-6 w-1/3 rounded" />
      </div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

interface TopRatedSliderProps {
  /** Raw orchard array — will be sorted by ratingAverage desc internally */
  orchards: Orchard[];
  /** Section heading */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Maximum number of items to display (default 12) */
  maxItems?: number;
  /** Show skeleton loaders instead of cards */
  isLoading?: boolean;
  /** Number of skeleton cards to show while loading */
  skeletonCount?: number;
}

export function TopRatedSlider({
  orchards,
  title = 'Top Rated Orchards',
  subtitle = 'Curated picks loved by our community — sorted by guest ratings.',
  maxItems = 12,
  isLoading = false,
  skeletonCount = 4,
}: TopRatedSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  // ── sort + slice ────────────────────────────────────────────────────────
  const sorted = [...orchards]
    .sort((a, b) => b.ratingAverage - a.ratingAverage || b.ratingCount - a.ratingCount)
    .slice(0, maxItems);

  // ── scroll state sync ───────────────────────────────────────────────────
  const syncScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    // derive active dot
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth
      : 280;
    const gap = 20;
    setActiveIndex(Math.round(el.scrollLeft / (cardWidth + gap)));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncScrollState();
    el.addEventListener('scroll', syncScrollState, { passive: true });
    const ro = new ResizeObserver(syncScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', syncScrollState);
      ro.disconnect();
    };
  }, [syncScrollState, sorted.length]);

  // ── navigation ──────────────────────────────────────────────────────────
  const scrollBy = useCallback((dir: 'prev' | 'next') => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth
      : 280;
    const gap = 20;
    const delta = dir === 'next' ? cardWidth + gap : -(cardWidth + gap);
    el.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.children[index] as HTMLElement | undefined;
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }, []);

  // ── dot count (visible cards estimate) ─────────────────────────────────
  const totalItems = isLoading ? skeletonCount : sorted.length;
  // show at most 8 dots; hide dots when there's only 1 page
  const dotCount = Math.min(totalItems, 8);

  // ── empty state ─────────────────────────────────────────────────────────
  if (!isLoading && sorted.length === 0) {
    return (
      <section className="container-page py-10" aria-label="Top Rated Orchards">
        <SectionHeader title={title} subtitle={subtitle} />
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-sand bg-cream py-14 text-center">
          <span className="text-4xl">🌳</span>
          <p className="text-sm text-faint">No rated orchards yet. Check back soon!</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="py-10 md:py-14"
      aria-label={title}
      id="top-rated-slider"
    >
      <div className="container-page">
        {/* ── Section header ── */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <SectionHeader title={title} subtitle={subtitle} />

          {/* Prev / Next arrow controls — desktop */}
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <NavButton
              dir="prev"
              onClick={() => scrollBy('prev')}
              disabled={!canScrollLeft}
              aria-label="Scroll to previous orchards"
            />
            <NavButton
              dir="next"
              onClick={() => scrollBy('next')}
              disabled={!canScrollRight}
              aria-label="Scroll to next orchards"
            />
          </div>
        </div>

        {/* ── Scroll track ── */}
        <div
          ref={trackRef}
          role="list"
          aria-label="Top rated orchard cards"
          className={cn(
            // scroll-snap container
            'flex gap-5 overflow-x-auto pb-4',
            // hide scrollbar but keep scroll
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            // snap
            'snap-x snap-mandatory',
            // momentum scroll on iOS
            'touch-pan-x'
          )}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {isLoading
            ? Array.from({ length: skeletonCount }, (_, i) => (
                <div
                  key={i}
                  role="listitem"
                  className={cn(
                    // responsive card widths
                    'w-[calc(100%-24px)]',             // mobile: ~1 card
                    'sm:w-[calc(50%-12px)]',            // sm:    2 cards
                    'lg:w-[calc(33.333%-14px)]',        // lg:    3 cards
                    'xl:w-[calc(25%-16px)]'             // xl:    4 cards
                  )}
                >
                  <SliderCardSkeleton />
                </div>
              ))
            : sorted.map((orchard, i) => (
                <div
                  key={orchard._id}
                  role="listitem"
                  className={cn(
                    'w-[calc(100%-24px)]',
                    'sm:w-[calc(50%-12px)]',
                    'lg:w-[calc(33.333%-14px)]',
                    'xl:w-[calc(25%-16px)]'
                  )}
                >
                  <SliderCard orchard={orchard} rank={i + 1} />
                </div>
              ))}
        </div>

        {/* ── Bottom row: dots + mobile arrows ── */}
        <div className="mt-4 flex items-center justify-between gap-4 sm:justify-center">
          {/* Mobile prev */}
          <NavButton
            dir="prev"
            onClick={() => scrollBy('prev')}
            disabled={!canScrollLeft}
            aria-label="Scroll to previous orchards"
            className="sm:hidden"
          />

          {/* Pagination dots */}
          {dotCount > 1 && (
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Slider position">
              {Array.from({ length: dotCount }, (_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => scrollToIndex(i)}
                  className={cn(
                    'rounded-full transition-all duration-300',
                    i === activeIndex
                      ? 'h-2 w-6 bg-forest'
                      : 'h-2 w-2 bg-sand hover:bg-sub'
                  )}
                />
              ))}
            </div>
          )}

          {/* Mobile next */}
          <NavButton
            dir="next"
            onClick={() => scrollBy('next')}
            disabled={!canScrollRight}
            aria-label="Scroll to next orchards"
            className="sm:hidden"
          />
        </div>
      </div>
    </section>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <p className="eyebrow mb-1">Community Favourites</p>
      <h2 className="font-serif text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-[13.5px] text-sub">{subtitle}</p>}
    </div>
  );
}

interface NavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  dir: 'prev' | 'next';
}

function NavButton({ dir, disabled, className, ...rest }: NavButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full border border-sand bg-cream shadow-soft transition-all duration-200',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'hover:border-forest hover:bg-forest hover:text-cream hover:shadow-card active:scale-95',
        className
      )}
    >
      {dir === 'prev' ? (
        <ChevronLeft className="h-5 w-5" />
      ) : (
        <ChevronRight className="h-5 w-5" />
      )}
    </button>
  );
}

// ─── skeleton export (for consuming pages) ───────────────────────────────────
export { SliderCardSkeleton as TopRatedSliderSkeleton };
