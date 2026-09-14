import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
  Navigation,
  Loader2,
} from 'lucide-react';
import { orchardService, type OrchardFilters } from '@/services/orchard.service';
import { wishlistService } from '@/services/wishlist.service';
import { recommendationService } from '@/services/recommendation.service';
import { OrchardCard, OrchardCardSkeleton } from '@/components/orchard/OrchardCard';
import { TopRatedSlider } from '@/components/orchard/TopRatedSlider';
import { RecommendedSection } from '@/components/recommendation/RecommendedSection';
import { Button, EmptyState } from '@/components/ui';
import { Pagination } from '@/components/ui/Pagination';
import { useMarketplace } from '@/context/MarketplaceContext';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/context/LocationContext';
import { formatCurrency } from '@/lib/format';
import { orchardSurface } from '@/lib/gradients';
import { cn } from '@/lib/cn';
import type { Orchard, FilterOptions, PageMeta, RecommendationItem } from '@/types';


/* ─── Constants ─────────────────────────────────────────────────────── */
const SORTS = [
  { value: 'newest',     label: 'Recommended' },
  { value: 'distance',   label: 'Nearest first 📍' },
  { value: 'price_asc',  label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating',     label: 'Top rated' },
  { value: 'popular',    label: 'Most trees' },
];

const RATINGS = [
  { label: 'Any',  v: 0   },
  { label: '4.0+', v: 4   },
  { label: '4.5+', v: 4.5 },
];

const RENT_TYPE_META: Record<string, { icon: string; label: string }> = {
  season:  { icon: '🌱', label: 'Whole Garden' },
  month:   { icon: '📅', label: 'Monthly Lease' },
  year:    { icon: '📆', label: 'Annual Lease' },
  harvest: { icon: '🍎', label: 'Per Harvest' },
};

const AMENITY_LABELS: Record<string, string> = {
  irrigation:      'Irrigation',
  drip_irrigation: 'Drip Irrigation',
  fencing:         'Fencing',
  storage:         'Storage',
  electricity:     'Electricity',
  water_supply:    'Water Supply',
  labour:          'Labour Included',
  caretaker:       'Caretaker',
  road_access:     'Road Access',
  security:        'Security',
  cold_storage:    'Cold Storage',
  pesticides:      'Pesticide Supply',
};

const friendlyAmenity = (key: string) => AMENITY_LABELS[key] ?? key.replace(/_/g, ' ');

const FALLBACK_RENT_TYPES = ['season', 'month', 'year', 'harvest'];

/* ─── Filter section with collapsible state ──────────────────────────── */
function useCollapse(key: string, defaultOpen = true) {
  const [open, setOpen] = useState<boolean>(() => {
    try { return sessionStorage.getItem(`fo_${key}`) !== 'false'; }
    catch { return defaultOpen; }
  });
  const toggle = () =>
    setOpen((v) => {
      try { sessionStorage.setItem(`fo_${key}`, String(!v)); } catch { /**/ }
      return !v;
    });
  return { open, toggle };
}

function FilterSection({
  label,
  badge,
  sKey,
  onClear,
  children,
}: {
  label: string;
  badge?: number;
  sKey: string;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  const { open, toggle } = useCollapse(sKey);
  return (
    <div className="border-b border-[#ede8dc] pb-4 pt-3 last:border-0">
      <button onClick={toggle} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.08em] text-faint">
          {label}
          {!!badge && (
            <span className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-terra px-[5px] text-[10px] font-bold text-cream">
              {badge}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          {onClear && !!badge && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="rounded px-1 text-[10px] font-semibold text-terra hover:bg-[#f3e7e1]"
            >
              Clear
            </span>
          )}
          {open ? <ChevronUp className="h-3.5 w-3.5 text-faint" /> : <ChevronDown className="h-3.5 w-3.5 text-faint" />}
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

const chip = (active: boolean) =>
  cn(
    'cursor-pointer whitespace-nowrap rounded-full border px-3 py-[6px] text-[12px] font-semibold transition-all',
    active ? 'border-forest bg-forest text-cream' : 'border-sand text-sub hover:border-faint'
  );

/* ═══════════════════════════════════════════════════════════════════════
   Page
══════════════════════════════════════════════════════════════════════ */
export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { isSaved, isCompared, toggleSave, toggleCompare } = useMarketplace();
  const { userLocation, getDistanceTo, requestLocation, status: locStatus } = useLocation();

  const [orchards, setOrchards] = useState<Orchard[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [recent, setRecent] = useState<Orchard[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const [topRated, setTopRated] = useState<Orchard[]>([]);
  const [topRatedLoading, setTopRatedLoading] = useState(true);

  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  const loadRecommendations = useCallback(() => {
    setRecommendationsLoading(true);
    setRecommendationsError(null);
    recommendationService
      .getPersonalized({ limit: 4 })
      .then((res) => setRecommendations(res.recommendations))
      .catch(() => setRecommendationsError('Unable to load personalized recommendations'))
      .finally(() => setRecommendationsLoading(false));
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [user, loadRecommendations]);


  /* ── Parsed URL state ── */
  const fruitList   = useMemo(() => (params.get('fruit')     || '').split(',').filter(Boolean), [params]);
  const amenityList = useMemo(() => (params.get('amenities') || '').split(',').filter(Boolean), [params]);
  const minTrees    = Number(params.get('minTrees') || 0);
  const rating      = Number(params.get('rating')   || 0);
  const availableOnly = params.get('available') === 'true';
  const harvestThisMonth = params.get('harvestThisMonth') === 'true';
  const upcomingHarvest = params.get('upcomingHarvest') === 'true';
  const peakSeason = params.get('peakSeason') === 'true';
  const rentType    = params.get('rentType')  ?? '';
  const district    = params.get('district')  ?? '';
  const maxDist     = Number(params.get('maxDist') || 0);

  // Dynamic slider values — fall back to options bounds when URL param is empty
  const pMin = options?.priceRange?.min ?? 0;
  const pMax = options?.priceRange?.max ?? 200000;
  const tMax = options?.treeRange?.max  ?? 500;
  const priceMin = Number(params.get('minPrice') ?? pMin);
  const priceMax = Number(params.get('maxPrice') ?? pMax);

  /* ── Data fetching ── */
  useEffect(() => {
    orchardService.getFilterOptions().then(setOptions).catch(() => {});
    if (user?.role === 'renter') {
      wishlistService.getRecentlyViewed().then(setRecent).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    setTopRatedLoading(true);
    orchardService
      .list({ sort: 'rating', limit: 12, page: 1 } as OrchardFilters & { limit?: number })
      .then((res) => setTopRated(res.data))
      .catch(() => {})
      .finally(() => setTopRatedLoading(false));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const sortVal = params.get('sort') || 'newest';
    const filters: OrchardFilters = {
      search:    params.get('search')    ?? undefined,
      fruit:     params.get('fruit')     ?? undefined,
      state:     params.get('state')     ?? undefined,
      district:  params.get('district')  ?? undefined,
      rentType:  params.get('rentType')  ?? undefined,
      amenities: params.get('amenities') ?? undefined,
      sort:      sortVal === 'distance' ? 'newest' : sortVal,
      minPrice:  params.get('minPrice')  ? Number(params.get('minPrice'))  : undefined,
      maxPrice:  params.get('maxPrice')  ? Number(params.get('maxPrice'))  : undefined,
      minTrees:  minTrees || undefined,
      rating:    rating   || undefined,
      available: availableOnly ? true : undefined,
      harvestThisMonth: harvestThisMonth ? true : undefined,
      upcomingHarvest: upcomingHarvest ? true : undefined,
      peakSeason: peakSeason ? true : undefined,
      page:      params.get('page') ? Number(params.get('page')) : 1,
    };
    try {
      const res = await orchardService.list(filters);
      setOrchards(res.data);
      setMeta(res.meta ?? null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => { load(); }, [load]);

  /* ── Client-side distance sorting and filtering ── */
  const displayOrchards = useMemo(() => {
    let list = orchards.slice();
    if (params.get('sort') === 'distance' && userLocation) {
      list.sort((a, b) => {
        const dA = getDistanceTo(a)?.straightKm ?? Infinity;
        const dB = getDistanceTo(b)?.straightKm ?? Infinity;
        return dA - dB;
      });
    }
    if (maxDist > 0 && userLocation) {
      list = list.filter((o) => {
        const d = getDistanceTo(o);
        return d ? d.straightKm <= maxDist : true;
      });
    }
    return list;
  }, [orchards, params, userLocation, getDistanceTo, maxDist]);

  /* ── URL helpers ── */
  const set = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const toggleFruit   = (f: string) => {
    const next = fruitList.includes(f) ? fruitList.filter((x) => x !== f) : [...fruitList, f];
    set('fruit', next.join(',') || undefined);
  };
  const toggleAmenity = (a: string) => {
    const next = amenityList.includes(a) ? amenityList.filter((x) => x !== a) : [...amenityList, a];
    set('amenities', next.join(',') || undefined);
  };

  const clearFilters = () => setParams(new URLSearchParams());

  /* ── Active filter count ── */
  const filterCount =
    fruitList.length +
    amenityList.length +
    (params.get('state')    ? 1 : 0) +
    (district               ? 1 : 0) +
    (rentType               ? 1 : 0) +
    (availableOnly          ? 1 : 0) +
    (harvestThisMonth       ? 1 : 0) +
    (upcomingHarvest        ? 1 : 0) +
    (peakSeason             ? 1 : 0) +
    (rating                 ? 1 : 0) +
    (params.get('minPrice') ? 1 : 0) +
    (params.get('maxPrice') ? 1 : 0) +
    (minTrees > 0           ? 1 : 0) +
    (maxDist > 0            ? 1 : 0);


  /* ── Amenity list ── */
  const allAmenities   = options?.availableAmenities ?? [];
  const shownAmenities = showAllAmenities ? allAmenities : allAmenities.slice(0, 5);

  /* ── Rent type list: prefer live facets, fall back to static list ── */
  const rentTypes = (options?.availableRentTypes?.length ?? 0) > 0
    ? (options!.availableRentTypes)
    : FALLBACK_RENT_TYPES;

  return (
    <main>
      {/* ── Hero ── */}
      <div className="container-page py-6">
        <div
          className="relative mb-6 overflow-hidden rounded-3xl px-9 py-9 text-[#f4f0e3]"
          style={{ background: 'linear-gradient(120deg,#2f5d3a 0%,#3f6b34 60%,#5a7a2e 100%)' }}
        >
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at 88% 18%,rgba(255,255,255,.14),transparent 42%)' }}
          />
          <p className="relative text-[12.5px] font-bold uppercase tracking-[.14em] opacity-80">
            India's orchard leasing marketplace
          </p>
          <h1 className="relative my-2 max-w-[18ch] font-serif text-[clamp(26px,3.6vw,40px)] font-semibold leading-[1.08]">
            Lease a fruiting orchard for the season ahead.
          </h1>
          <p className="relative max-w-[52ch] text-[15px] opacity-90">
            Verified mango, litchi, pomegranate &amp; guava orchards with transparent yields,
            availability calendars and seller-direct bookings.
          </p>
        </div>
      </div>

      {/* ── Top Rated Slider ── */}
      <div className="border-y border-sand bg-paper/60">
        <TopRatedSlider
          orchards={topRated}
          isLoading={topRatedLoading}
          title="Top Rated Orchards"
          subtitle="Community favourites — sorted by verified guest ratings."
          maxItems={12}
        />
      </div>

      {/* ── Smart Recommendations Section ── */}
      <div className="container-page pt-6">
        <RecommendedSection
          title="Recommended For You"
          subtitle="Personalized recommendations calculated using your activity, preferences, and orchard quality algorithms."
          items={recommendations}
          isLoading={recommendationsLoading}
          error={recommendationsError}
          onRetry={loadRecommendations}
          maxItems={4}
        />
      </div>

      {/* ── Filter + Results ── */}

      <div className="container-page py-6">
        <div className="flex flex-wrap items-start gap-6">

          {/* ════ Sidebar ════ */}
          <aside
            className={cn(
              'card flex-1 basis-[250px] self-start p-5 lg:sticky lg:top-[84px] lg:block',
              mobileFilters
                ? 'fixed inset-0 z-50 max-w-none overflow-y-auto rounded-none'
                : 'hidden max-w-[282px] min-w-[240px] lg:block'
            )}
          >
            {/* Header */}
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-[17px] w-[17px] text-forest" />
                <span className="text-[15px] font-bold">Filters</span>
                {filterCount > 0 && (
                  <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] bg-terra px-[5px] text-[11px] font-bold text-cream">
                    {filterCount}
                  </span>
                )}
              </div>
              {filterCount > 0 && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-[12px] font-semibold text-terra">
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>

            {/* ── 1. Lease Type ── */}
            <FilterSection label="Lease Type" sKey="rentType" badge={rentType ? 1 : 0} onClear={() => set('rentType')}>
              <div className="flex flex-col gap-1.5">
                {rentTypes.map((rt) => (
                  <button
                    key={rt}
                    id={`filter-renttype-${rt}`}
                    onClick={() => set('rentType', rentType === rt ? '' : rt)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[12.5px] font-semibold transition-all',
                      rentType === rt
                        ? 'border-forest bg-forest text-cream'
                        : 'border-sand bg-cream text-sub hover:border-faint'
                    )}
                  >
                    <span>{RENT_TYPE_META[rt]?.icon ?? '🌿'}</span>
                    <span>{RENT_TYPE_META[rt]?.label ?? rt}</span>
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* ── 2. Fruit Type (live facets) ── */}
            <FilterSection label="Fruit Type" sKey="fruit" badge={fruitList.length} onClear={() => set('fruit')}>
              <div className="flex flex-wrap gap-[7px]">
                {(options?.availableFruitTypes ?? options?.fruitTypes ?? []).map((f) => (
                  <div
                    key={f}
                    id={`filter-fruit-${f}`}
                    onClick={() => toggleFruit(f)}
                    className={chip(fruitList.includes(f))}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </div>
                ))}
              </div>
            </FilterSection>

            {/* ── 3. Location: State chips + District input ── */}
            <FilterSection
              label="Location"
              sKey="location"
              badge={(params.get('state') ? 1 : 0) + (district ? 1 : 0)}
              onClear={() => { set('state'); set('district'); }}
            >
              <div className="mb-3 flex flex-wrap gap-[7px]">
                {(options?.states ?? []).map((s) => {
                  const active = params.get('state') === s;
                  return (
                    <div
                      key={s}
                      id={`filter-state-${s}`}
                      onClick={() => set('state', active ? '' : s)}
                      className={chip(active)}
                    >
                      {s}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-sand bg-[#faf8f3] px-3 py-2">
                <Search className="h-3.5 w-3.5 flex-none text-faint" />
                <input
                  id="filter-district"
                  value={district}
                  onChange={(e) => set('district', e.target.value || undefined)}
                  placeholder="District (e.g. Ratnagiri)"
                  className="w-full bg-transparent text-[12.5px] text-ink outline-none placeholder:text-faint"
                />
                {district && (
                  <X className="h-3.5 w-3.5 cursor-pointer text-faint hover:text-ink"
                    onClick={() => set('district')} />
                )}
              </div>
            </FilterSection>

            {/* ── 4. Distance Filter ── */}
            <FilterSection label="Distance" sKey="distance" badge={maxDist > 0 ? 1 : 0} onClear={() => set('maxDist')}>
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="text-faint flex items-center gap-1">
                  <Navigation className="h-3 w-3 text-forest" /> Max distance
                </span>
                <span className="font-semibold text-forest">
                  {maxDist > 0 ? `${maxDist} km` : 'Any distance'}
                </span>
              </div>
              {userLocation ? (
                <input
                  id="filter-max-dist"
                  type="range"
                  min={0}
                  max={500}
                  step={25}
                  value={maxDist}
                  onChange={(e) => set('maxDist', Number(e.target.value) > 0 ? e.target.value : undefined)}
                  className="w-full"
                />
              ) : (
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={locStatus === 'locating'}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-forest bg-avail py-2 text-xs font-bold text-forest hover:bg-forest hover:text-cream transition-colors"
                >
                  {locStatus === 'locating' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-forest" />
                  ) : (
                    <Navigation className="h-3.5 w-3.5" />
                  )}
                  <span>{locStatus === 'locating' ? 'Locating…' : 'Enable GPS location'}</span>
                </button>
              )}
            </FilterSection>

            {/* ── 5. Price Range (dynamic bounds) ── */}
            <FilterSection
              label="Price Range"
              sKey="price"
              badge={(params.get('minPrice') ? 1 : 0) + (params.get('maxPrice') ? 1 : 0)}
              onClear={() => { set('minPrice'); set('maxPrice'); }}
            >
              <div className="mb-1 flex justify-between text-[12px] font-semibold text-forest">
                <span>{formatCurrency(priceMin)}</span>
                <span>{formatCurrency(priceMax)}</span>
              </div>
              <label className="mb-0.5 block text-[11px] text-faint">Min</label>
              <input
                id="filter-price-min"
                type="range"
                min={pMin} max={pMax} step={1000}
                value={priceMin}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  set('minPrice', v > pMin ? String(v) : undefined);
                }}
                className="mb-2 w-full"
              />
              <label className="mb-0.5 block text-[11px] text-faint">Max</label>
              <input
                id="filter-price-max"
                type="range"
                min={pMin} max={pMax} step={1000}
                value={priceMax}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  set('maxPrice', v < pMax ? String(v) : undefined);
                }}
                className="w-full"
              />
            </FilterSection>

            {/* ── 6. Min Trees (dynamic bound) ── */}
            <FilterSection label="Min Trees" sKey="trees" badge={minTrees > 0 ? 1 : 0} onClear={() => set('minTrees')}>
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="text-faint">{minTrees}+ trees</span>
                <span className="font-semibold text-forest">{tMax} max</span>
              </div>
              <input
                id="filter-trees"
                type="range"
                min={0} max={tMax} step={20}
                value={minTrees}
                onChange={(e) => set('minTrees', e.target.value || undefined)}
                className="w-full"
              />
            </FilterSection>

            {/* ── 7. Amenities (live facets) ── */}
            {allAmenities.length > 0 && (
              <FilterSection label="Amenities" sKey="amenities" badge={amenityList.length} onClear={() => set('amenities')}>
                <div className="flex flex-col gap-1.5">
                  {shownAmenities.map((a) => (
                    <label key={a} className="flex cursor-pointer items-center gap-2.5 text-[12.5px] font-semibold">
                      <input
                        id={`filter-amenity-${a}`}
                        type="checkbox"
                        checked={amenityList.includes(a)}
                        onChange={() => toggleAmenity(a)}
                        className="h-[15px] w-[15px] cursor-pointer accent-forest"
                      />
                      {friendlyAmenity(a)}
                    </label>
                  ))}
                </div>
                {allAmenities.length > 5 && (
                  <button
                    onClick={() => setShowAllAmenities((v) => !v)}
                    className="mt-2 text-[11.5px] font-semibold text-forest underline-offset-2 hover:underline"
                  >
                    {showAllAmenities ? 'Show less' : `+ ${allAmenities.length - 5} more`}
                  </button>
                )}
              </FilterSection>
            )}

            {/* ── 8. Rating ── */}
            <FilterSection label="Min Rating" sKey="rating" badge={rating ? 1 : 0} onClear={() => set('rating')}>
              <div className="flex gap-[7px]">
                {RATINGS.map((r) => (
                  <div
                    key={r.label}
                    id={`filter-rating-${r.label}`}
                    onClick={() => set('rating', r.v ? String(r.v) : '')}
                    className={chip(rating === r.v)}
                  >
                    {r.label}
                  </div>
                ))}
              </div>
            </FilterSection>

            {/* ── 8. Availability & Harvest ── */}
            <FilterSection
              label="Availability & Harvest"
              sKey="avail"
              badge={(availableOnly ? 1 : 0) + (harvestThisMonth ? 1 : 0) + (upcomingHarvest ? 1 : 0) + (peakSeason ? 1 : 0)}
              onClear={() => {
                set('available');
                set('harvestThisMonth');
                set('upcomingHarvest');
                set('peakSeason');
              }}
            >
              <div className="flex flex-col gap-2.5">
                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold">
                  <input
                    id="filter-available"
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => set('available', e.target.checked ? 'true' : '')}
                    className="h-[16px] w-[16px] cursor-pointer accent-forest"
                  />
                  Available now only
                </label>

                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold">
                  <input
                    id="filter-harvest-this-month"
                    type="checkbox"
                    checked={harvestThisMonth}
                    onChange={(e) => set('harvestThisMonth', e.target.checked ? 'true' : '')}
                    className="h-[16px] w-[16px] cursor-pointer accent-forest"
                  />
                  Harvesting this month
                </label>

                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold">
                  <input
                    id="filter-upcoming-harvest"
                    type="checkbox"
                    checked={upcomingHarvest}
                    onChange={(e) => set('upcomingHarvest', e.target.checked ? 'true' : '')}
                    className="h-[16px] w-[16px] cursor-pointer accent-forest"
                  />
                  Upcoming harvest
                </label>

                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold">
                  <input
                    id="filter-peak-season"
                    type="checkbox"
                    checked={peakSeason}
                    onChange={(e) => set('peakSeason', e.target.checked ? 'true' : '')}
                    className="h-[16px] w-[16px] cursor-pointer accent-forest"
                  />
                  Peak harvest season
                </label>
              </div>
            </FilterSection>

            {mobileFilters && (
              <Button className="mt-5 w-full" onClick={() => setMobileFilters(false)}>
                Show {displayOrchards.length} results
              </Button>
            )}
          </aside>

          {/* ════ Results ════ */}
          <section className="min-w-[300px] flex-[3_1_600px]">
            {/* Toolbar */}
            <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3.5">
              <span className="text-sm text-sub">
                <b className="text-base text-ink">{displayOrchards.length}</b> orchards available
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileFilters(true)}>
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                  {filterCount > 0 && (
                    <span className="ml-1 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-terra px-[4px] text-[10px] font-bold text-cream">
                      {filterCount}
                    </span>
                  )}
                </Button>
                <label className="flex items-center gap-2 text-[13px] text-sub">
                  Sort by
                  <select
                    id="explore-sort"
                    value={params.get('sort') || 'newest'}
                    onChange={(e) => set('sort', e.target.value)}
                    className="cursor-pointer rounded-[10px] border border-sand bg-cream px-3 py-2 text-[13.5px] font-semibold text-ink"
                  >
                    {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {/* Active filter chip strip */}
            {filterCount > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {rentType && (
                  <span className="flex items-center gap-1 rounded-full bg-forest px-3 py-1 text-[11.5px] font-semibold text-cream">
                    {RENT_TYPE_META[rentType]?.icon} {RENT_TYPE_META[rentType]?.label ?? rentType}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => set('rentType')} />
                  </span>
                )}
                {fruitList.map((f) => (
                  <span key={f} className="flex items-center gap-1 rounded-full bg-[#edf4e8] px-3 py-1 text-[11.5px] font-semibold text-forest">
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFruit(f)} />
                  </span>
                ))}
                {params.get('state') && (
                  <span className="flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-[11.5px] font-semibold text-sub">
                    {params.get('state')}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => set('state')} />
                  </span>
                )}
                {district && (
                  <span className="flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-[11.5px] font-semibold text-sub">
                    📍 {district}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => set('district')} />
                  </span>
                )}
                {maxDist > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-[#f2f7ef] px-3 py-1 text-[11.5px] font-semibold text-forest border border-[#d2e5ca]">
                    📍 Within {maxDist} km
                    <X className="h-3 w-3 cursor-pointer" onClick={() => set('maxDist')} />
                  </span>
                )}
                {amenityList.map((a) => (
                  <span key={a} className="flex items-center gap-1 rounded-full bg-[#faf0e8] px-3 py-1 text-[11.5px] font-semibold text-[#a05a45]">
                    {friendlyAmenity(a)}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => toggleAmenity(a)} />
                  </span>
                ))}
                {availableOnly && (
                  <span className="flex items-center gap-1 rounded-full bg-avail px-3 py-1 text-[11.5px] font-semibold text-forest">
                    Available now
                    <X className="h-3 w-3 cursor-pointer" onClick={() => set('available')} />
                  </span>
                )}
                {harvestThisMonth && (
                  <span className="flex items-center gap-1 rounded-full bg-avail px-3 py-1 text-[11.5px] font-semibold text-forest">
                    Harvesting this month
                    <X className="h-3 w-3 cursor-pointer" onClick={() => set('harvestThisMonth')} />
                  </span>
                )}
                {upcomingHarvest && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11.5px] font-semibold text-amber-800 border border-amber-200">
                    Upcoming harvest
                    <X className="h-3 w-3 cursor-pointer" onClick={() => set('upcomingHarvest')} />
                  </span>
                )}
                {peakSeason && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11.5px] font-semibold text-emerald-800 border border-emerald-200">
                    ⭐ Peak season
                    <X className="h-3 w-3 cursor-pointer" onClick={() => set('peakSeason')} />
                  </span>
                )}
              </div>
            )}


            {/* Cards / empty / skeleton */}
            {loading ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(258px,1fr))] gap-5">
                {Array.from({ length: 6 }).map((_, i) => <OrchardCardSkeleton key={i} />)}
              </div>
            ) : displayOrchards.length === 0 ? (
              <EmptyState
                title="No orchards match those filters"
                description="Try widening your distance / price range or clearing a filter."
                action={<Button onClick={clearFilters}>Clear all filters</Button>}
              />
            ) : (
              <>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(258px,1fr))] gap-5">
                  {displayOrchards.map((o) => (
                    <OrchardCard
                      key={o._id}
                      orchard={o}
                      isSaved={isSaved(o._id)}
                      isCompared={isCompared(o._id)}
                      onToggleSave={toggleSave}
                      onToggleCompare={toggleCompare}
                    />
                  ))}
                </div>
                {meta && meta.totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination page={meta.page} totalPages={meta.totalPages} onChange={(p) => set('page', String(p))} />
                  </div>
                )}
              </>
            )}

            {/* Recently viewed */}
            {recent.length > 0 && (
              <div className="mt-[34px]">
                <h3 className="mb-3.5 font-serif text-[18px] font-semibold">Recently viewed</h3>
                <div className="flex gap-3.5 overflow-x-auto pb-1.5">
                  {recent.map((o) => (
                    <a key={o._id} href={`/orchards/${o.slug}`}
                      className="w-[210px] flex-none overflow-hidden rounded-[13px] border border-sand bg-cream"
                    >
                      <div className="h-24" style={orchardSurface(o.thumbnail, o.fruitTypes, o._id)} />
                      <div className="px-3 py-2.5">
                        <h4 className="mb-0.5 font-serif text-sm leading-[1.2]">{o.gardenName}</h4>
                        <p className="text-[11.5px] text-faint">{o.district}, {o.state}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
