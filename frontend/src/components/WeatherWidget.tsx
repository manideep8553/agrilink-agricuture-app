import { useState, useEffect } from 'react';
import { FiSun, FiCloud, FiCloudRain, FiCloudSnow, FiWind } from 'react-icons/fi';

interface Weather {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
  icon: string;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
            );
            const data = await res.json();
            const codes: Record<number, { condition: string; icon: string }> = {
              0: { condition: 'Clear', icon: 'sun' },
              1: { condition: 'Mainly Clear', icon: 'sun' },
              2: { condition: 'Partly Cloudy', icon: 'cloud' },
              3: { condition: 'Overcast', icon: 'cloud' },
              45: { condition: 'Foggy', icon: 'cloud' },
              51: { condition: 'Light Drizzle', icon: 'rain' },
              61: { condition: 'Rain', icon: 'rain' },
              71: { condition: 'Snow', icon: 'snow' },
              80: { condition: 'Rain Showers', icon: 'rain' },
              95: { condition: 'Thunderstorm', icon: 'rain' },
            };
            const c = codes[data.current.weather_code] || { condition: 'Unknown', icon: 'cloud' };
            setWeather({
              temp: Math.round(data.current.temperature_2m),
              condition: c.condition,
              humidity: data.current.relative_humidity_2m,
              windSpeed: Math.round(data.current.wind_speed_10m),
              location: 'Current Location',
              icon: c.icon,
            });
          } catch { setFallback(); }
          finally { setLoading(false); }
        },
        () => { setFallback(); setLoading(false); }
      );
    } else {
      setFallback();
      setLoading(false);
    }
  }, []);

  const setFallback = () => {
    setWeather({
      temp: 28, condition: 'Partly Cloudy', humidity: 65, windSpeed: 12,
      location: 'India', icon: 'cloud',
    });
  };

  const Icon = weather?.icon === 'sun' ? FiSun : weather?.icon === 'rain' ? FiCloudRain : weather?.icon === 'snow' ? FiCloudSnow : FiCloud;

  if (loading) return <div className="glass rounded-2xl p-4"><div className="skeleton h-16" /></div>;

  return (
    <div className="glass rounded-2xl p-4 bg-gradient-to-br from-amber-50/50 to-forest-50/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon className="text-amber-500" size={28} />
          <div>
            <p className="text-2xl font-heading font-bold text-forest-700">{weather?.temp}°C</p>
            <p className="text-xs text-forest-400">{weather?.condition}</p>
          </div>
        </div>
        <div className="text-right text-xs text-forest-400">
          <p>💧 {weather?.humidity}%</p>
          <p>🌬️ {weather?.windSpeed} km/h</p>
        </div>
      </div>
      <p className="text-[10px] text-forest-400 mt-2">{weather?.location}</p>
    </div>
  );
}
