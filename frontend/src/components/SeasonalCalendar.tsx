import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar } from 'react-icons/fi';
import { SEASONS } from '../utils/helpers';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const currentMonth = new Date().getMonth();

const seasonMap: Record<string, [number, number]> = {
  'Rabi': [10, 3],
  'Kharif': [6, 9],
  'Zaid': [3, 5],
};

export default function SeasonalCalendar() {
  const [hoveredSeason, setHoveredSeason] = useState<string | null>(null);

  const getCurrentSeason = () => {
    if (currentMonth >= 9 || currentMonth <= 2) return 'Rabi';
    if (currentMonth >= 3 && currentMonth <= 5) return 'Zaid';
    return 'Kharif';
  };

  const currentSeason = getCurrentSeason();

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center space-x-2 mb-4">
        <FiCalendar className="text-amber-500" size={18} />
        <h3 className="font-heading font-bold text-forest-700">Seasonal Calendar</h3>
      </div>

      <div className="grid grid-cols-12 gap-1 mb-4">
        {MONTHS.map((month, i) => {
          let season = '';
          if (i >= 9 || i <= 2) season = 'Rabi';
          else if (i >= 3 && i <= 5) season = 'Zaid';
          else season = 'Kharif';

          const colors: Record<string, string> = {
            Rabi: 'bg-amber-200 text-amber-800',
            Kharif: 'bg-green-200 text-green-800',
            Zaid: 'bg-terracotta-200 text-terracotta-800',
          };

          return (
            <div key={i} className="text-center">
              <div className={`text-[8px] font-medium mb-0.5 text-forest-400`}>{month}</div>
              <div className={`h-1.5 rounded-full ${colors[season]} ${i === currentMonth ? 'ring-2 ring-forest-700' : ''}`} />
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        {Object.entries(SEASONS).map(([season, crops]) => {
          const isActive = season === currentSeason;
          return (
            <div key={season}
              onMouseEnter={() => setHoveredSeason(season)}
              onMouseLeave={() => setHoveredSeason(null)}
              className={`p-3 rounded-xl cursor-default transition-all ${isActive ? 'bg-forest-700 text-cream' : 'hover:bg-forest-50'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{season} Season</span>
                {isActive && <span className="text-[10px] px-2 py-0.5 bg-amber-500 text-forest-900 rounded-full font-semibold">Current</span>}
              </div>
              <div className="flex flex-wrap gap-1">
                {crops.map(crop => (
                  <span key={crop} className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-cream' : 'bg-forest-100 text-forest-600'}`}>
                    {crop}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
