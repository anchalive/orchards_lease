import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitCompareArrows, 
  Trash2, 
  Star, 
  MapPin, 
  Check, 
  X, 
  Sprout, 
  ArrowRight
} from 'lucide-react';
import { wishlistService } from '@/services/wishlist.service';
import { useMarketplace } from '@/context/MarketplaceContext';
import { Button, EmptyState, Badge } from '@/components/ui';
import { formatCurrency, titleCase } from '@/lib/format';
import { orchardSurface } from '@/lib/gradients';
import type { Orchard } from '@/types';

export default function ComparePage() {
  const navigate = useNavigate();
  const { compareIds, toggleCompare, clearCompare } = useMarketplace();
  const [orchards, setOrchards] = useState<Orchard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (compareIds.length === 0) {
      setOrchards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Fetch full orchard objects for the compared IDs directly from wishlistService
    wishlistService
      .getCompare()
      .then((items) => {
        setOrchards(items.slice(0, 4));
      })
      .catch(() => setOrchards([]))
      .finally(() => setLoading(false));
  }, [compareIds]);

  if (loading) {
    return (
      <main className="container-page py-12">
        <div className="sk mb-6 h-8 w-64 rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="sk h-96 rounded-2xl" />
          ))}
        </div>
      </main>
    );
  }

  if (orchards.length === 0) {
    return (
      <main className="container-page py-16">
        <EmptyState
          emoji="⚖️"
          title="No orchards selected for comparison"
          description="Browse the marketplace and click 'Compare' on up to four orchards to evaluate them side-by-side."
          action={<Button onClick={() => navigate('/explore')}>Explore Orchards</Button>}
        />
      </main>
    );
  }

  // Aggregate all unique amenities present across the compared orchards
  const allAmenities = Array.from(
    new Set(orchards.flatMap((o) => o.amenities || []))
  );

  return (
    <main className="container-page py-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-sand pb-5">
        <div>
          <div className="flex items-center gap-2 text-forest font-semibold text-sm mb-1">
            <GitCompareArrows className="h-4 w-4" />
            <span>Side-by-Side Comparison</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink">
            Compare Orchards ({orchards.length}/4)
          </h1>
          <p className="text-sm text-sub mt-1">
            Compare price, crop types, plot dimensions, water supply, and facilities to choose the best orchard.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => clearCompare()}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Clear All
          </Button>
          <Button size="sm" onClick={() => navigate('/explore')}>
            Add More <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="overflow-x-auto pb-6">
        <div className="min-w-[760px] grid grid-cols-[180px_repeat(auto-fit,minmax(220px,1fr))] gap-4">
          
          {/* Header Column Label */}
          <div className="font-semibold text-xs uppercase tracking-wider text-faint flex items-end pb-3">
            Orchard
          </div>

          {/* Orchard Header Cards */}
          {orchards.map((o) => (
            <div key={o._id} className="relative rounded-2xl border border-sand bg-cream p-4 shadow-sm flex flex-col justify-between">
              <button
                onClick={() => toggleCompare(o._id)}
                className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-gray-500 hover:bg-rose-100 hover:text-rose-600 transition-colors shadow-sm"
                title="Remove from comparison"
              >
                <X className="h-4 w-4" />
              </button>

              <div>
                <div 
                  className="h-28 w-full rounded-xl mb-3 overflow-hidden" 
                  style={orchardSurface(o.thumbnail, o.fruitTypes, o._id)} 
                />
                <Badge tone={o.available ? 'green' : 'gray'} className="mb-2">
                  {o.available ? 'Available' : 'Booked'}
                </Badge>
                <h3 className="font-serif font-bold text-lg text-ink leading-snug line-clamp-1">
                  {o.gardenName}
                </h3>
                <p className="text-xs text-sub flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 text-faint flex-shrink-0" />
                  {o.district}, {o.state}
                </p>
              </div>

              <Button
                size="sm"
                className="mt-4 w-full"
                onClick={() => navigate(`/orchards/${o.slug}`)}
              >
                View Details
              </Button>
            </div>
          ))}

          {/* Feature Row: Price */}
          <div className="font-bold text-xs uppercase tracking-wider text-faint py-3 border-t border-sand/60 flex items-center">
            Price &amp; Rent Type
          </div>
          {orchards.map((o) => (
            <div key={o._id} className="py-3 border-t border-sand/60">
              <span className="font-serif text-xl font-bold text-terra">
                {formatCurrency(o.price)}
              </span>
              <span className="text-xs text-faint block mt-0.5">
                per {o.rentType}
              </span>
            </div>
          ))}

          {/* Feature Row: Plot Size */}
          <div className="font-bold text-xs uppercase tracking-wider text-faint py-3 border-t border-sand/60 flex items-center">
            Plot Size
          </div>
          {orchards.map((o) => (
            <div key={o._id} className="py-3 border-t border-sand/60 font-semibold text-sm text-ink">
              {o.totalArea} {o.areaUnit}s
            </div>
          ))}

          {/* Feature Row: Trees & Yield */}
          <div className="font-bold text-xs uppercase tracking-wider text-faint py-3 border-t border-sand/60 flex items-center">
            Trees &amp; Yield
          </div>
          {orchards.map((o) => (
            <div key={o._id} className="py-3 border-t border-sand/60 text-sm text-ink">
              <span className="font-bold">{o.totalTrees.toLocaleString()}</span> trees
              <span className="text-xs text-sub block">Est. {o.expectedYield.toLocaleString()} kg yield</span>
            </div>
          ))}

          {/* Feature Row: Fruit Types */}
          <div className="font-bold text-xs uppercase tracking-wider text-faint py-3 border-t border-sand/60 flex items-center">
            Crop Varieties
          </div>
          {orchards.map((o) => (
            <div key={o._id} className="py-3 border-t border-sand/60">
              <div className="flex flex-wrap gap-1">
                {o.fruitTypes.map((f) => (
                  <span key={f} className="rounded-md bg-avail px-2 py-0.5 text-xs font-semibold text-forest">
                    {titleCase(f)}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* Feature Row: Organic Certification */}
          <div className="font-bold text-xs uppercase tracking-wider text-faint py-3 border-t border-sand/60 flex items-center">
            Organic Status
          </div>
          {orchards.map((o) => {
            const isCert = (o as any).organicCertification?.isCertified;
            return (
              <div key={o._id} className="py-3 border-t border-sand/60 text-sm">
                {isCert ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                    <Sprout className="h-3.5 w-3.5 text-emerald-600" />
                    Organic Certified
                  </span>
                ) : (
                  <span className="text-faint text-xs">Standard Farming</span>
                )}
              </div>
            );
          })}

          {/* Feature Row: Water Supply */}
          <div className="font-bold text-xs uppercase tracking-wider text-faint py-3 border-t border-sand/60 flex items-center">
            Water Supply
          </div>
          {orchards.map((o) => {
            const primary = (o as any).waterSources?.primary || (o as any).waterSource || 'Borewell';
            const yearRound = (o as any).waterSources?.availableYearRound ?? true;
            return (
              <div key={o._id} className="py-3 border-t border-sand/60 text-sm">
                <div className="font-semibold text-forest">{primary}</div>
                <div className="text-xs text-sub mt-0.5">
                  {yearRound ? '💧 12-Month Supply' : '⚠️ Seasonal Supply'}
                </div>
              </div>
            );
          })}

          {/* Feature Row: Soil Type */}
          <div className="font-bold text-xs uppercase tracking-wider text-faint py-3 border-t border-sand/60 flex items-center">
            Soil Type
          </div>
          {orchards.map((o) => (
            <div key={o._id} className="py-3 border-t border-sand/60 text-sm font-medium text-ink">
              {(o as any).soilType || 'Loamy'} Soil
            </div>
          ))}

          {/* Feature Row: Guest Rating */}
          <div className="font-bold text-xs uppercase tracking-wider text-faint py-3 border-t border-sand/60 flex items-center">
            Guest Rating
          </div>
          {orchards.map((o) => (
            <div key={o._id} className="py-3 border-t border-sand/60 text-sm">
              {o.ratingCount > 0 ? (
                <span className="flex items-center gap-1 font-bold text-ink">
                  <Star className="h-4 w-4 fill-gold text-gold" />
                  {o.ratingAverage.toFixed(1)} ({o.ratingCount})
                </span>
              ) : (
                <span className="text-faint text-xs">No reviews yet</span>
              )}
            </div>
          ))}

          {/* Feature Rows: Facilities & Amenities Checklist */}
          {allAmenities.map((amenity) => (
            <React.Fragment key={amenity}>
              <div className="font-semibold text-xs text-sub py-2.5 border-t border-sand/40 flex items-center">
                {titleCase(amenity)}
              </div>
              {orchards.map((o) => {
                const hasAmenity = o.amenities?.includes(amenity);
                return (
                  <div key={o._id} className="py-2.5 border-t border-sand/40">
                    {hasAmenity ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <X className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}

        </div>
      </div>
    </main>
  );
}
