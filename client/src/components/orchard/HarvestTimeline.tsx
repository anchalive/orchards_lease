import { Calendar, Info, Leaf } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { HarvestSeason } from '@/types';

// Month names list
export const MONTHS = [
  { id: 1, name: 'Jan', fullName: 'January' },
  { id: 2, name: 'Feb', fullName: 'February' },
  { id: 3, name: 'Mar', fullName: 'March' },
  { id: 4, name: 'Apr', fullName: 'April' },
  { id: 5, name: 'May', fullName: 'May' },
  { id: 6, name: 'Jun', fullName: 'June' },
  { id: 7, name: 'Jul', fullName: 'July' },
  { id: 8, name: 'Aug', fullName: 'August' },
  { id: 9, name: 'Sep', fullName: 'September' },
  { id: 10, name: 'Oct', fullName: 'October' },
  { id: 11, name: 'Nov', fullName: 'November' },
  { id: 12, name: 'Dec', fullName: 'December' },
];

export interface HarvestTimelineProps {
  harvestSeasons?: HarvestSeason[];
  title?: string;
  className?: string;
}

// Check if month is within the range (handles calendar wrap-around)
export const isMonthInRange = (m: number, start: number, end: number) => {
  if (start <= end) {
    return m >= start && m <= end;
  } else {
    return m >= start || m <= end;
  }
};

export function getHarvestBadge(harvestSeasons: HarvestSeason[]) {
  if (!harvestSeasons || harvestSeasons.length === 0) {
    return null;
  }

  const currentMonth = new Date().getMonth() + 1;

  // Check if currently harvesting any crop
  const activeSeasons = harvestSeasons.filter((s) =>
    isMonthInRange(currentMonth, s.startMonth, s.endMonth)
  );

  if (activeSeasons.length > 0) {
    const inPeak = activeSeasons.some((s) =>
      isMonthInRange(currentMonth, s.peakStartMonth, s.peakEndMonth)
    );
    return {
      text: inPeak ? 'Peak Season' : 'Harvesting Now',
      icon: '🍎',
      tone: 'green' as const,
      description: inPeak
        ? `Peak harvest period for ${activeSeasons.find(s => isMonthInRange(currentMonth, s.peakStartMonth, s.peakEndMonth))?.fruitName}`
        : `Active harvest for ${activeSeasons.map((s) => s.fruitName).join(', ')}`,
    };
  }

  // Check nearest upcoming
  let nearestSeason: HarvestSeason | null = null;
  let minDiff = Infinity;

  for (const s of harvestSeasons) {
    const diff = s.startMonth >= currentMonth
      ? s.startMonth - currentMonth
      : (12 - currentMonth) + s.startMonth;
    
    if (diff < minDiff) {
      minDiff = diff;
      nearestSeason = s;
    }
  }

  if (nearestSeason) {
    const startMonthName = MONTHS[nearestSeason.startMonth - 1].fullName;
    return {
      text: `Harvest Starts in ${startMonthName}`,
      icon: '🌱',
      tone: 'orange' as const,
      description: `${nearestSeason.fruitName} harvest will begin in ${startMonthName}`,
    };
  }

  return {
    text: 'Finished',
    icon: '✅',
    tone: 'gray' as const,
    description: 'All harvest periods completed for this cycle',
  };
}

export function HarvestTimeline({ harvestSeasons = [], title, className }: HarvestTimelineProps) {
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const badge = getHarvestBadge(harvestSeasons);

  if (harvestSeasons.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-sand bg-cream p-6 text-center text-sub", className)}>
        <Calendar className="mx-auto h-8 w-8 text-faint mb-2" />
        <p className="text-sm font-semibold">No harvest schedule configured</p>
        <p className="text-xs text-faint mt-1">This orchard has not specified its fruiting timeline yet.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-sand bg-cream p-5 shadow-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-chip pb-4">
        <div>
          <h3 className="font-serif text-[18px] font-bold text-ink">
            {title || "Harvest Availability Timeline"}
          </h3>
          <p className="text-xs text-faint mt-0.5">
            Overview of fruiting calendars, peaks, and seasonal windows.
          </p>
        </div>

        {badge && (
          <div className="flex items-center gap-2">
            <span className={cn(
              "rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1.5 border shadow-sm",
              badge.tone === 'green'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : badge.tone === 'orange'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-stone-50 text-stone-700 border-stone-200'
            )}>
              <span>{badge.icon}</span>
              <span>{badge.text}</span>
            </span>
          </div>
        )}
      </div>

      {badge?.description && (
        <div className="mb-5 flex items-start gap-2 rounded-xl bg-paper px-3 py-2 text-xs text-sub border border-sand/40">
          <Info className="h-4 w-4 flex-none text-forest mt-0.5" />
          <span>{badge.description}</span>
        </div>
      )}

      {/* Grid Timeline */}
      <div className="overflow-x-auto">
        <div className="min-w-[580px] space-y-3 pb-2 pt-2 relative">
          
          {/* Header Row (Months) */}
          <div className="grid grid-cols-12 gap-1 border-b border-sand pb-2 mb-2 font-semibold text-xs text-sub text-center">
            {MONTHS.map((m) => {
              const isCurrent = m.id === currentMonth;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "py-1 rounded relative",
                    isCurrent && "text-terra font-extrabold"
                  )}
                >
                  {m.name}
                  {isCurrent && (
                    <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 flex flex-col items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-terra" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Fruit Rows */}
          {harvestSeasons.map((season, idx) => (
            <div key={idx} className="flex flex-col gap-1.5 border-b border-chip/40 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between text-xs font-bold text-ink px-1 mb-1">
                <span className="flex items-center gap-1">
                  <Leaf className="h-3.5 w-3.5 text-forest" />
                  {season.fruitName}
                </span>
                <span className="text-[11px] font-semibold text-faint">
                  {MONTHS[season.startMonth - 1].name} - {MONTHS[season.endMonth - 1].name}
                  {season.startMonth > season.endMonth && " (Year-spanning)"}
                </span>
              </div>

              {/* Month Blocks */}
              <div className="grid grid-cols-12 gap-1 relative">
                {MONTHS.map((m) => {
                  const isHarvest = isMonthInRange(m.id, season.startMonth, season.endMonth);
                  const isPeak = isMonthInRange(m.id, season.peakStartMonth, season.peakEndMonth);
                  const isCurrent = m.id === currentMonth;

                  return (
                    <div
                      key={m.id}
                      title={`${season.fruitName}: ${m.fullName} ${isPeak ? '(Peak Season)' : isHarvest ? '(Harvesting)' : '(Off-season)'}`}
                      className={cn(
                        "h-7 rounded-[7px] transition-all relative flex items-center justify-center border",
                        isPeak
                          ? "bg-forest border-forest-dark text-cream shadow-sm"
                          : isHarvest
                            ? "bg-avail border-forest/20 text-forest font-semibold"
                            : "bg-paper/40 border-sand/30 text-faint/50",
                        isCurrent && "ring-2 ring-terra ring-offset-1 z-10"
                      )}
                    >
                      {isPeak ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider">Peak</span>
                      ) : isHarvest ? (
                        <span className="text-[9px] font-semibold">Active</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Vertical line helper for current month */}
          {/* Note: absolute positioning over the month grid could be complex due to the label column,
              but since we highlight cells directly with "ring-2 ring-terra", it looks extremely polished and performs perfectly without absolute alignment hacks. */}

        </div>
      </div>

      {/* Legend */}
      <div className="mt-5 pt-4 border-t border-chip flex flex-wrap gap-x-6 gap-y-2.5 text-xs text-sub">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-7 rounded-[4px] bg-forest border border-forest-dark flex items-center justify-center">
            <span className="text-[7px] text-cream font-bold uppercase">Peak</span>
          </div>
          <span className="font-medium text-ink">Peak Harvesting period (highest quality/volume)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-7 rounded-[4px] bg-avail border border-forest/20 flex items-center justify-center">
            <span className="text-[7px] text-forest font-semibold uppercase">Active</span>
          </div>
          <span className="font-medium text-ink">Active Harvest window</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-3.5 rounded-full bg-terra ring-2 ring-terra ring-offset-1" />
          <span className="font-medium text-ink">Current Month ({MONTHS[currentMonth - 1].fullName})</span>
        </div>
      </div>
    </div>
  );
}

// Single Harvest Badge component for listing card
export function HarvestBadge({ harvestSeasons = [] }: { harvestSeasons?: HarvestSeason[] }) {
  const badge = getHarvestBadge(harvestSeasons);
  if (!badge) return null;

  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[11.5px] font-bold tracking-[.02em] border flex items-center gap-1 shadow-sm',
        badge.tone === 'green'
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : badge.tone === 'orange'
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-stone-50 text-stone-700 border-stone-200'
      )}
    >
      <span>{badge.icon}</span>
      <span>{badge.text}</span>
    </span>
  );
}
