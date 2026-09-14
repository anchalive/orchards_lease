import { useEffect, useState } from 'react';
import { orchardService } from '@/services/orchard.service';
import type { HealthScoreData } from '@/types';
import { Activity, Droplet, Sprout, ShieldAlert, Award, Info, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/cn';

interface OrchardHealthScoreProps {
  orchardId: string;
}

export function OrchardHealthScore({ orchardId }: OrchardHealthScoreProps) {
  const [health, setHealth] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    orchardService
      .getHealthScore(orchardId)
      .then(setHealth)
      .catch((err) => {
        console.error('Error loading health score:', err);
      })
      .finally(() => setLoading(false));
  }, [orchardId]);

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-sand bg-cream p-6">
        <div className="h-6 w-48 rounded bg-chip mb-4" />
        <div className="flex flex-wrap gap-6 items-center">
          <div className="h-32 w-32 rounded-full bg-chip" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-3/4 rounded bg-chip" />
            <div className="h-4 w-1/2 rounded bg-chip" />
          </div>
        </div>
      </div>
    );
  }

  if (!health) return null;

  const { score, rating, breakdown } = health;

  // Rating styles
  const ratingStyle = {
    Excellent: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    Good: 'text-green-800 bg-green-50 border-green-200',
    Fair: 'text-amber-800 bg-amber-50 border-amber-200',
    'Needs Improvement': 'text-terra bg-orange-50/50 border-orange-200',
  }[rating] || 'text-sub bg-chip border-sand';

  const progressColor = {
    Excellent: 'stroke-emerald-600',
    Good: 'stroke-green-600',
    Fair: 'stroke-amber-600',
    'Needs Improvement': 'stroke-terra',
  }[rating] || 'stroke-forest';

  // SVG Circular progress properties
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Breakdown fields with titles, weights, and current score
  const metrics = [
    { label: 'Soil Fertility', val: breakdown.soil, max: 20, icon: Sprout },
    { label: 'Maintenance Status', val: breakdown.maintenance, max: 20, icon: Activity },
    { label: 'Irrigation System', val: breakdown.irrigation, max: 15, icon: Droplet },
    { label: 'Water Source Quality', val: breakdown.waterSource ?? 0, max: 10, icon: Info },
    { label: 'Pest History', val: breakdown.pestHistory, max: 10, icon: ShieldAlert },
    { label: 'Disease History', val: breakdown.diseaseHistory ?? 0, max: 10, icon: ShieldAlert },
    { label: 'Organic Certification', val: breakdown.certification, max: 5, icon: Award },
    { label: 'Production Estimate', val: breakdown.production, max: 5, icon: FileSpreadsheet },
    { label: 'Orchard Maturity (Age)', val: breakdown.orchardAge ?? 0, max: 5, icon: Info },
  ];

  // Improvement tips based on raw parameter values
  const getImprovementTips = () => {
    const tips = [];
    if (breakdown.irrigation === 0) {
      tips.push('Add irrigation details (irrigation method and year-round source availability) to improve your score.');
    }
    if (breakdown.soil === 0) {
      tips.push('Provide soil fertility status (High, Medium, or Low) to optimize quality transparency.');
    }
    if (breakdown.maintenance === 0) {
      tips.push('Set maintenance status to Good or Average to assure renters of site quality.');
    }
    if ((breakdown.waterSource ?? 0) === 0) {
      tips.push('Add water source quality details to satisfy irrigation checks.');
    }
    if (breakdown.certification === 0) {
      tips.push('Verify and link an organic certificate document to get full certification credit.');
    }
    if ((breakdown.orchardAge ?? 0) === 0) {
      tips.push('Input the orchard age / maturity to complete the lifecycle evaluation.');
    }
    return tips;
  };

  const tips = getImprovementTips();

  return (
    <div className="rounded-2xl border border-sand bg-cream p-5 md:p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-sand/40 pb-3">
        <div>
          <h3 className="font-serif text-[18px] font-bold text-ink">Orchard Health &amp; Quality Score</h3>
          <p className="text-xs text-faint">Agricultural viability &amp; operational metrics overview</p>
        </div>
        <div className={cn('rounded-full border px-3 py-1 text-xs font-bold transition-all shadow-sm', ratingStyle)}>
          {rating}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[160px_1fr]">
        {/* Circle Score Indicator */}
        <div className="flex flex-col items-center justify-center p-2 bg-paper/30 rounded-2xl border border-sand/20">
          <div className="relative h-28 w-28">
            <svg className="h-full w-full -rotate-90">
              {/* Background circle */}
              <circle
                className="stroke-chip"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              {/* Progress circle */}
              <circle
                className={cn('transition-all duration-500 ease-out', progressColor)}
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-serif text-3xl font-bold text-ink leading-none">{score}</span>
              <span className="text-[10px] font-bold text-faint uppercase tracking-wider mt-0.5">/ 100</span>
            </div>
          </div>
          <div className="mt-2 text-center">
            <span className="text-[11px] font-semibold text-sub">Overall Health</span>
          </div>
        </div>

        {/* Breakdown Progress Bars */}
        <div className="space-y-3.5">
          <p className="text-xs text-sub leading-relaxed">
            The health score measures operational readiness and resource quality. Complete the orchard profile
            to increase trust with prospective renters and optimize score metrics.
          </p>

          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {metrics.map((m) => {
              const IconComp = m.icon;
              const percent = (m.val / m.max) * 100;
              return (
                <div key={m.label} className="flex flex-col">
                  <div className="flex items-center justify-between text-xs font-semibold text-ink mb-1">
                    <span className="flex items-center gap-1.5 text-[#3a4632]">
                      <IconComp className="h-3.5 w-3.5 text-faint" />
                      {m.label}
                    </span>
                    <span className="font-mono text-sub">
                      {m.val} <span className="text-[10px] text-faint">/ {m.max}</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-chip">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        percent >= 80 ? 'bg-emerald-600' : percent >= 50 ? 'bg-green-600' : percent >= 30 ? 'bg-amber-500' : 'bg-terra'
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actionable Profile Advice (only if scores could be improved) */}
      {tips.length > 0 && (
        <div className="mt-5 rounded-xl border border-sand bg-paper/50 p-4">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-forest mb-2">
            <Info className="h-4 w-4" /> Recommended Improvements
          </h4>
          <ul className="list-disc pl-4 space-y-1.5 text-xs text-sub">
            {tips.slice(0, 3).map((tip, idx) => (
              <li key={idx} className="leading-relaxed">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
