import React, { useEffect, useState } from 'react';
import { weatherService } from '@/services/weather.service';
import type { WeatherData } from '@/types';
import ForecastCard from './ForecastCard';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Droplets,
  Wind,
  Sunrise,
  Sunset,
  HelpCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface WeatherCardProps {
  orchardId: string;
}

export const WeatherIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
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

export const WeatherCard: React.FC<WeatherCardProps> = ({ orchardId }) => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = () => {
    setLoading(true);
    setError(null);
    weatherService
      .getWeather(orchardId)
      .then((res) => {
        setData(res);
      })
      .catch((err: any) => {
        const msg = err.response?.data?.message || 'Failed to load weather data';
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWeather();
  }, [orchardId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-sand bg-cream p-6 animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-6 w-36 bg-chip rounded" />
          <div className="h-4 w-24 bg-chip rounded" />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="col-span-1 flex items-center gap-4">
            <div className="h-16 w-16 bg-chip rounded-2xl" />
            <div className="space-y-2">
              <div className="h-8 w-16 bg-chip rounded" />
              <div className="h-4 w-20 bg-chip rounded" />
            </div>
          </div>
          <div className="col-span-2 grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 bg-chip rounded-xl" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-28 bg-chip rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-terra/30 bg-terra-light/10 p-6 flex flex-col items-center text-center justify-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-terra/10 text-terra">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-serif text-base font-bold text-ink">Weather Insights Unavailable</h3>
          <p className="text-sm text-sub mt-1 max-w-[40ch]">{error}</p>
        </div>
        <button
          onClick={fetchWeather}
          className="flex items-center gap-2 rounded-xl bg-forest px-4 py-2 text-xs font-bold text-cream transition-all hover:bg-forest-dark"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry loading
        </button>
      </div>
    );
  }

  if (!data) return null;

  const current = data.current;

  const getStyleForCondition = (icon: string) => {
    switch (icon) {
      case 'sun':
        return 'from-[#fef9c3]/50 to-[#eff6ff]/30 border-[#fde047]';
      case 'cloud-sun':
        return 'from-[#fefafd]/50 to-[#f0fdf4]/30 border-[#d9f99d]';
      case 'cloud':
      case 'cloud-fog':
        return 'from-[#f4f4f5]/50 to-[#fafaf9]/30 border-[#e4e4e7]';
      case 'cloud-rain':
      case 'cloud-drizzle':
      case 'cloud-lightning':
        return 'from-[#f0f9ff]/50 to-[#f1f5f9]/30 border-[#bae6fd]';
      case 'cloud-snow':
        return 'from-[#f0fdfa]/50 to-[#e0f2fe]/30 border-[#99f6e4]';
      default:
        return 'from-cream to-cream/40 border-sand';
    }
  };

  const gradientClass = getStyleForCondition(current.icon);

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-6 shadow-sm transition-all hover:shadow-md ${gradientClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand/30 pb-4 mb-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink">Orchard Weather Insights</h3>
          <p className="text-xs text-sub mt-0.5 font-medium">Real-time agricultural conditions</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#2f5d3a] bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Forecast
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Current summary */}
        <div className="col-span-1 flex items-center gap-4 bg-cream/30 backdrop-blur-sm rounded-2xl p-4 border border-sand/10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cream shadow-sm text-forest">
            <WeatherIcon iconName={current.icon} className="h-10 w-10" />
          </div>
          <div>
            <div className="flex items-baseline">
              <span className="font-serif text-4xl font-extrabold text-ink">{current.temperature}</span>
              <span className="text-xl font-bold text-ink">°C</span>
            </div>
            <div className="text-sm font-bold text-ink mt-0.5">{current.condition}</div>
            <div className="text-xs text-faint font-semibold mt-0.5">Feels like {current.feelsLike}°C</div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="col-span-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatBox label="Feels Like" value={`${current.feelsLike}°C`} icon={<HelpCircle className="h-3.5 w-3.5" />} />
          <StatBox label="Humidity" value={`${current.humidity}%`} icon={<Droplets className="h-3.5 w-3.5 text-blue-500" />} />
          <StatBox label="Wind Speed" value={`${current.windSpeed} km/h`} icon={<Wind className="h-3.5 w-3.5 text-slate-500" />} />
          <StatBox label="Rain Chance" value={`${current.rainChance}%`} icon={<Droplets className="h-3.5 w-3.5 text-indigo-500" />} />
          <StatBox label="Sunrise" value={current.sunrise} icon={<Sunrise className="h-3.5 w-3.5 text-amber-500" />} />
          <StatBox label="Sunset" value={current.sunset} icon={<Sunset className="h-3.5 w-3.5 text-orange-500" />} />
        </div>
      </div>

      {/* Forecast */}
      <div className="mt-6">
        <h4 className="text-xs font-bold text-faint uppercase tracking-wider mb-3">7-Day Forecast</h4>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 overflow-x-auto">
          {data.forecast.slice(0, 7).map((day, idx) => (
            <ForecastCard key={day.date} day={day} isToday={idx === 0} />
          ))}
        </div>
      </div>
    </div>
  );
};

function StatBox({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-sand bg-cream/80 px-3.5 py-2.5 backdrop-blur-sm shadow-sm transition-all hover:bg-cream">
      <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-chip/60">
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-bold text-faint uppercase tracking-[.05em]">{label}</div>
        <div className="text-[13px] font-bold text-ink">{value}</div>
      </div>
    </div>
  );
}

export default WeatherCard;
