import React from 'react';
import type { WeatherForecastDay } from '@/types';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  CloudFog,
  HelpCircle
} from 'lucide-react';

interface ForecastCardProps {
  day: WeatherForecastDay;
  isToday: boolean;
}

const WeatherIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  switch (iconName) {
    case 'sun':
      return <Sun className={className} />;
    case 'cloud-sun':
      return <CloudSun className={className} />;
    case 'cloud':
      return <Cloud className={className} />;
    case 'cloud-rain':
      return <CloudRain className={className} />;
    case 'cloud-drizzle':
      return <CloudDrizzle className={className} />;
    case 'cloud-snow':
      return <CloudSnow className={className} />;
    case 'cloud-lightning':
      return <CloudLightning className={className} />;
    case 'cloud-fog':
      return <CloudFog className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
};

export const ForecastCard: React.FC<ForecastCardProps> = ({ day, isToday }) => {
  const formatDay = (dateStr: string) => {
    if (isToday) return 'Today';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } catch {
      return dateStr;
    }
  };

  const formatMonthDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col items-center justify-between rounded-2xl border border-sand bg-cream/60 p-3.5 text-center transition-all hover:bg-cream hover:shadow-sm">
      <div className="text-xs font-bold text-ink">{formatDay(day.date)}</div>
      <div className="text-[10px] font-semibold text-faint mb-2">{formatMonthDate(day.date)}</div>
      
      <div className="my-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-chip/60 text-forest">
        <WeatherIcon iconName={day.icon} className="h-6 w-6" />
      </div>

      <div className="mt-1 text-[11px] font-bold text-sub truncate max-w-[80px]" title={day.condition}>
        {day.condition}
      </div>

      <div className="mt-2 flex items-baseline gap-1 text-xs">
        <span className="font-bold text-ink">{day.tempMax}°</span>
        <span className="text-[10px] text-faint font-semibold">{day.tempMin}°</span>
      </div>

      {day.rainChance > 0 ? (
        <div className="mt-2 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600">
          💧 {day.rainChance}%
        </div>
      ) : (
        <div className="mt-2 h-4" />
      )}
    </div>
  );
};

export default ForecastCard;
