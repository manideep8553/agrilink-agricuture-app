import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface PriceData {
  cropName: string;
  state: string;
  district: string;
  modalPrice: number;
  priceDate: string;
}

interface PriceContextType {
  prices: PriceData[];
  heatmapData: any[];
  crops: string[];
  loading: boolean;
  selectedCrop: string;
  setSelectedCrop: (crop: string) => void;
  selectedState: string;
  setSelectedState: (state: string) => void;
  fetchPrices: (params?: any) => Promise<void>;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export function PriceProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [crops, setCrops] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedState, setSelectedState] = useState('');

  useEffect(() => {
    fetchCrops();
    fetchHeatmap();
  }, []);

  useEffect(() => {
    fetchPrices({ cropName: selectedCrop || undefined, state: selectedState || undefined });
  }, [selectedCrop, selectedState]);

  const fetchCrops = async () => {
    try {
      const { data } = await axios.get('/api/prices/crops');
      setCrops(data.crops);
    } catch { /* ignore */ }
  };

  const fetchHeatmap = async () => {
    try {
      const { data } = await axios.get('/api/prices/heatmap');
      setHeatmapData(data.heatmapData);
    } catch { /* ignore */ }
  };

  const fetchPrices = async (params?: any) => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/prices', { params });
      setPrices(data.prices);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  return (
    <PriceContext.Provider value={{ prices, heatmapData, crops, loading, selectedCrop, setSelectedCrop, selectedState, setSelectedState, fetchPrices }}>
      {children}
    </PriceContext.Provider>
  );
}

export const usePrices = () => {
  const ctx = useContext(PriceContext);
  if (!ctx) throw new Error('usePrices must be used within PriceProvider');
  return ctx;
};
