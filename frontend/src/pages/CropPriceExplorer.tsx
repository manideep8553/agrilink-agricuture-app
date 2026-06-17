import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiTrendingDown, FiSearch, FiMapPin, FiCalendar, FiDownload } from 'react-icons/fi';
import { usePrices } from '../context/PriceContext';
import { formatPrice, INDIAN_STATES } from '../utils/helpers';

const INDIA_MAP_PATH = 'M125,45 L145,30 L175,35 L195,50 L205,70 L215,85 L225,100 L235,120 L245,140 L250,160 L255,180 L250,200 L240,215 L230,230 L220,240 L210,245 L200,240 L190,235 L180,225 L175,210 L170,195 L165,180 L160,165 L150,155 L145,145 L140,135 L135,125 L130,115 L128,100 L125,85 L120,70 L115,55 Z';

interface StateCoord {
  id: string;
  name: string;
  path: string;
  labelX: number;
  labelY: number;
}

const STATE_COORDS: StateCoord[] = [
  { id: 'JK', name: 'Jammu & Kashmir', path: 'M130,15 L150,10 L170,15 L175,30 L165,40 L150,35 L135,30 Z', labelX: 152, labelY: 22 },
  { id: 'HP', name: 'Himachal Pradesh', path: 'M155,42 L170,38 L178,48 L168,55 L155,50 Z', labelX: 166, labelY: 46 },
  { id: 'PB', name: 'Punjab', path: 'M140,50 L155,48 L160,58 L148,62 L138,58 Z', labelX: 148, labelY: 54 },
  { id: 'HR', name: 'Haryana', path: 'M140,65 L155,62 L160,72 L148,76 L138,72 Z', labelX: 148, labelY: 68 },
  { id: 'UK', name: 'Uttarakhand', path: 'M165,58 L180,55 L185,65 L175,68 L168,64 Z', labelX: 174, labelY: 60 },
  { id: 'UP', name: 'Uttar Pradesh', path: 'M160,75 L190,70 L200,82 L185,88 L165,85 L155,80 Z', labelX: 178, labelY: 78 },
  { id: 'RJ', name: 'Rajasthan', path: 'M110,70 L140,65 L145,85 L135,100 L115,95 L108,82 Z', labelX: 125, labelY: 82 },
  { id: 'MP', name: 'Madhya Pradesh', path: 'M135,105 L170,95 L185,105 L175,118 L150,120 L138,115 Z', labelX: 158, labelY: 108 },
  { id: 'BH', name: 'Bihar', path: 'M195,85 L210,82 L215,92 L205,96 L195,92 Z', labelX: 204, labelY: 88 },
  { id: 'WB', name: 'West Bengal', path: 'M210,95 L225,90 L230,100 L220,108 L210,102 Z', labelX: 220, labelY: 98 },
  { id: 'GJ', name: 'Gujarat', path: 'M90,95 L115,90 L120,108 L105,115 L92,108 Z', labelX: 104, labelY: 102 },
  { id: 'MH', name: 'Maharashtra', path: 'M95,125 L125,120 L145,125 L150,140 L130,150 L110,145 L100,138 Z', labelX: 122, labelY: 134 },
  { id: 'OR', name: 'Odisha', path: 'M180,120 L200,115 L208,128 L192,135 L180,130 Z', labelX: 194, labelY: 124 },
  { id: 'TS', name: 'Telangana', path: 'M140,150 L160,145 L168,158 L152,165 L142,158 Z', labelX: 154, labelY: 154 },
  { id: 'AP', name: 'Andhra Pradesh', path: 'M145,170 L165,165 L175,178 L185,190 L170,200 L155,195 L148,185 Z', labelX: 168, labelY: 182 },
  { id: 'KA', name: 'Karnataka', path: 'M115,160 L140,155 L150,170 L145,185 L125,190 L115,178 Z', labelX: 132, labelY: 172 },
  { id: 'KL', name: 'Kerala', path: 'M120,195 L138,190 L140,205 L130,215 L120,208 Z', labelX: 132, labelY: 200 },
  { id: 'TN', name: 'Tamil Nadu', path: 'M145,200 L165,195 L175,210 L165,225 L150,220 L142,212 Z', labelX: 158, labelY: 210 },
  { id: 'DL', name: 'Delhi', path: 'M138,68 L145,66 L147,72 L140,74 Z', labelX: 142, labelY: 70 },
];

const getPriceColor = (price: number): string => {
  if (price > 5000) return '#CC5533';
  if (price > 3000) return '#F59E0B';
  if (price > 1500) return '#81c784';
  return '#1B4332';
};

export default function CropPriceExplorer() {
  const { prices, heatmapData, crops, loading, selectedCrop, setSelectedCrop, selectedState, setSelectedState } = usePrices();
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const currentPrices = prices.filter(p => !selectedCrop || p.cropName === selectedCrop);
  const latestPrices = currentPrices.reduce((acc: any, p) => {
    const key = `${p.state}-${p.district}`;
    if (!acc[key] || new Date(p.priceDate) > new Date(acc[key].priceDate)) {
      acc[key] = p;
    }
    return acc;
  }, {});

  const avgPrice = currentPrices.length > 0
    ? currentPrices.reduce((s, p) => s + p.modalPrice, 0) / currentPrices.length
    : 0;

  const trend = prices.slice(-7).map(p => p.modalPrice);
  const isUp = trend.length > 1 && trend[trend.length - 1] > trend[0];

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-heading text-forest-700">Crop Price Explorer</h1>
              <p className="text-forest-500 text-sm mt-1">Real-time mandi prices across India</p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <select value={selectedCrop} onChange={e => setSelectedCrop(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm">
                <option value="">All Crops</option>
                {crops.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={selectedState} onChange={e => setSelectedState(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm">
                <option value="">All States</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="p-2.5 rounded-xl border border-forest-200 hover:bg-forest-50 transition-all text-forest-500">
                <FiDownload size={16} />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass rounded-2xl p-5">
              <p className="text-xs text-forest-400 mb-1">Avg Price</p>
              <p className="text-2xl font-heading font-bold text-forest-700">{formatPrice(avgPrice)}</p>
              <p className="text-xs text-forest-400">per unit</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-xs text-forest-400 mb-1">Markets</p>
              <p className="text-2xl font-heading font-bold text-forest-700">{Object.keys(latestPrices).length}</p>
              <p className="text-xs text-forest-400">active mandis</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-xs text-forest-400 mb-1">Trend</p>
              <div className="flex items-center space-x-2">
                {isUp ? <FiTrendingUp className="text-green-500" /> : <FiTrendingDown className="text-red-500" />}
                <span className={`text-2xl font-heading font-bold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                  {isUp ? '+' : ''}{(trend.length > 1 ? ((trend[trend.length-1] - trend[0]) / trend[0] * 100) : 0).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-forest-400">7-day change</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-xs text-forest-400 mb-1">Data Source</p>
              <p className="text-lg font-heading font-bold text-forest-700">Agmarknet</p>
              <p className="text-xs text-forest-400">Government mandi data</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* India Map */}
            <div className="lg:col-span-3 glass rounded-2xl p-6">
              <h2 className="font-heading font-bold text-forest-700 mb-4">India Price Heatmap</h2>
              <svg viewBox="80 0 180 230" className="w-full h-auto max-h-[500px]">
                {STATE_COORDS.map(state => {
                  const data = heatmapData.find(d => d.state.toLowerCase().includes(state.name.split(' ')[0].toLowerCase()));
                  const price = data?.latestPrice || 0;
                  const isHovered = hoveredState === state.id;
                  return (
                    <g key={state.id}>
                      <path
                        d={state.path}
                        fill={price > 0 ? getPriceColor(price) : '#e8f5e9'}
                        stroke={isHovered ? '#1B4332' : '#FDFBF7'}
                        strokeWidth={isHovered ? 2 : 1}
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredState(state.id)}
                        onMouseLeave={() => setHoveredState(null)}
                      />
                      <text x={state.labelX} y={state.labelY}
                        textAnchor="middle" fontSize="8" fill={price > 3000 ? '#fff' : '#1B4332'}
                        className="pointer-events-none font-medium">
                        {state.id}
                      </text>
                    </g>
                  );
                })}
                {hoveredState && (
                  <g>
                    <rect x="10" y="10" rx="6" width="150" height="60" fill="#1B4332" opacity="0.95" />
                    <text x="20" y="30" fill="#FDFBF7" fontSize="10" fontWeight="bold">
                      {STATE_COORDS.find(s => s.id === hoveredState)?.name}
                    </text>
                    <text x="20" y="48" fill="#F59E0B" fontSize="10">
                      Avg: {formatPrice(heatmapData.find(d => d.state.toLowerCase().includes(STATE_COORDS.find(s => s.id === hoveredState)?.name.split(' ')[0].toLowerCase() || ''))?.latestPrice || 0)}
                    </text>
                    <text x="20" y="62" fill="#81c784" fontSize="9">
                      Districts: {heatmapData.find(d => d.state.toLowerCase().includes(STATE_COORDS.find(s => s.id === hoveredState)?.name.split(' ')[0].toLowerCase() || ''))?.districts?.length || 0}
                    </text>
                  </g>
                )}
              </svg>
              <div className="flex items-center justify-center space-x-4 mt-4 text-xs text-forest-500">
                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#1B4332] mr-1" /> Low</div>
                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#81c784] mr-1" /> Medium</div>
                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#F59E0B] mr-1" /> High</div>
                <div className="flex items-center"><div className="w-3 h-3 rounded bg-[#CC5533] mr-1" /> Very High</div>
              </div>
            </div>

            {/* Price Table */}
            <div className="lg:col-span-2">
              <div className="glass rounded-2xl p-6">
                <h2 className="font-heading font-bold text-forest-700 mb-4">Latest Prices</h2>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {loading ? (
                    <div className="space-y-2">
                      {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
                    </div>
                  ) : (
                    Object.values(latestPrices).slice(0, 20).map((price: any, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-forest-50 transition-all">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-forest-100 to-amber-50 flex items-center justify-center text-sm">🌾</div>
                          <div>
                            <p className="text-sm font-medium text-forest-700">{price.cropName}</p>
                            <p className="text-xs text-forest-400 flex items-center"><FiMapPin className="mr-0.5" size={10} />{price.district}, {price.state}</p>
                          </div>
                        </div>
                        <span className="font-semibold text-amber-600">{formatPrice(price.modalPrice)}</span>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
