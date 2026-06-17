import { useState, useEffect, useRef } from 'react';
import { FiTrendingUp } from 'react-icons/fi';
import { formatPrice } from '../utils/helpers';
import api from '../utils/api';

interface TickerPrice {
  cropName: string;
  modalPrice: number;
  state: string;
}

export default function MarketTicker() {
  const [prices, setPrices] = useState<TickerPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrices = async () => {
    try {
      const { data } = await api.get('/prices', { params: { days: 1 } });
      const latest = data.prices.slice(0, 20);
      setPrices(latest);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  if (loading) return <div className="skeleton h-10 rounded-xl" />;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="flex items-center bg-forest-700 text-cream px-3 py-2">
        <FiTrendingUp size={14} className="mr-2 text-amber-400" />
        <span className="text-xs font-semibold whitespace-nowrap">LIVE MARKET</span>
      </div>
      <div className="overflow-hidden relative py-2">
        <div ref={tickerRef} className="flex space-x-8 animate-scroll" style={{ animationDuration: `${prices.length * 3}s` }}>
          {[...prices, ...prices].map((price, i) => (
            <div key={i} className="flex items-center space-x-2 whitespace-nowrap">
              <span className="text-sm font-medium text-forest-700">{price.cropName}</span>
              <span className="text-sm font-bold text-amber-600">{formatPrice(price.modalPrice)}</span>
              <span className="text-[10px] text-forest-400">{price.state}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll { animation: scroll linear infinite; }
      `}</style>
    </div>
  );
}
