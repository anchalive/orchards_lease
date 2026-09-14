import { ArrowRight, Compass, Leaf, Sprout, Trees } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

export function HeroSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[32px] border border-sand/80 bg-gradient-to-br from-[#f8f4e9] via-[#eef4e9] to-[#e2edd5] p-6 shadow-soft sm:p-8 lg:p-12',
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.7),_transparent_42%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-forest/15 bg-cream/80 px-3.5 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-forest">
            <Leaf className="h-3.5 w-3.5" />
            Orchard leasing marketplace
          </div>

          <h1 className="mt-5 max-w-[13ch] font-serif text-[clamp(28px,4vw,48px)] font-semibold leading-[1.05] text-ink sm:max-w-[15ch]">
            Discover and lease premium orchards effortlessly.
          </h1>

          <p className="mt-4 max-w-[58ch] text-[15px] leading-7 text-sub sm:text-[16px]">
            Connect with trusted landowners, compare verified orchards, and secure the perfect lease for your next harvest in just a few clicks.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button className="shadow-soft" size="lg">
              Explore Orchards
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="bg-cream/70">
              Lease Your Land
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-4 text-sm text-sub">
            <div className="flex items-center gap-2 rounded-full border border-sand bg-cream/70 px-3 py-2">
              <Sprout className="h-4 w-4 text-forest" />
              Verified listings
            </div>
            <div className="flex items-center gap-2 rounded-full border border-sand bg-cream/70 px-3 py-2">
              <Compass className="h-4 w-4 text-forest" />
              Flexible seasonal access
            </div>
            <div className="flex items-center gap-2 rounded-full border border-sand bg-cream/70 px-3 py-2">
              <Trees className="h-4 w-4 text-forest" />
              Direct owner booking
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-br from-[#2f5d3a] via-[#4f7b3d] to-[#95b86d] p-4 shadow-pop sm:p-5">
            <div className="rounded-[24px] border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                    Featured orchard
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">Sunrise Grove</p>
                </div>
                <span className="rounded-full bg-[#fff3d8] px-3 py-1 text-[12px] font-semibold text-[#7a4a16]">
                  Available now
                </span>
              </div>

              <div className="mt-4 rounded-[20px] border border-[#e7e7d8] bg-[#f9efe0] p-4">
                <div className="relative h-44 overflow-hidden rounded-[16px] border border-[#d9dfc8] bg-[linear-gradient(135deg,_rgba(47,93,58,0.95),_rgba(120,163,87,0.86))]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.25),_transparent_30%)]" />
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#24492d] to-transparent" />

                  <div className="absolute left-5 top-5 h-16 w-16 rounded-full border border-white/50 bg-white/20" />
                  <div className="absolute right-6 top-8 h-20 w-20 rounded-full border border-white/50 bg-white/10" />
                  <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                    <div className="h-20 w-10 rounded-t-full border border-white/50 bg-[#4f7b3d]" />
                    <div className="h-28 w-12 rounded-t-full border border-white/50 bg-[#3b6b36]" />
                    <div className="h-16 w-10 rounded-t-full border border-white/50 bg-[#5b8f46]" />
                    <div className="h-24 w-12 rounded-t-full border border-white/50 bg-[#2d5d39]" />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[12px] font-semibold text-[#5d6f51]">
                  <span className="rounded-full bg-white/70 px-2.5 py-1">Mango orchard</span>
                  <span className="rounded-full bg-white/70 px-2.5 py-1">Seasonal lease</span>
                  <span className="rounded-full bg-white/70 px-2.5 py-1">Verified owner</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
