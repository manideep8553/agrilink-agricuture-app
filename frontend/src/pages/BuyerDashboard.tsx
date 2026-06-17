import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSearch, FiMapPin, FiFilter, FiHeart, FiShoppingCart, FiStar } from 'react-icons/fi';
import { formatPrice } from '../utils/helpers';
import api from '../utils/api';

interface Listing {
  id: string;
  cropName: string;
  variety?: string;
  quantity: number;
  unit: string;
  price: number;
  state: string;
  district: string;
  images: string[];
  organicCertified: boolean;
  description?: string;
  farmer: { id: string; name: string; trustScore: number; isVerified: boolean; state: string };
  createdAt: string;
}

export default function BuyerDashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ state: '', district: '', minPrice: '', maxPrice: '', organicCertified: false });
  const [cart, setCart] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchListings();
  }, [page, filters]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12, ...filters };
      if (filters.minPrice) params.minPrice = parseFloat(filters.minPrice);
      if (filters.maxPrice) params.maxPrice = parseFloat(filters.maxPrice);
      const { data } = await api.get('/listings', { params });
      setListings(data.listings);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleWishlist = async (listingId: string) => {
    try {
      await api.post(`/users/wishlist/${listingId}`);
    } catch (err) { console.error(err); }
  };

  const addToCart = async (listingId: string) => {
    try {
      await api.post(`/users/cart/${listingId}`, { quantity: 1 });
      const { data } = await api.get('/users/cart');
      setCart(data.cart);
    } catch (err) { console.error(err); }
  };

  const filteredListings = listings.filter(l =>
    l.cropName.toLowerCase().includes(search.toLowerCase()) ||
    l.farmer.name.toLowerCase().includes(search.toLowerCase()) ||
    l.district.toLowerCase().includes(search.toLowerCase())
  );

  const cartTotal = cart.reduce((s, i) => s + i.listing.price * i.quantity, 0);

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-heading text-forest-700">Crop Marketplace</h1>
              <p className="text-forest-500 text-sm mt-1">Browse fresh produce from farmers across India</p>
            </div>
            <button onClick={() => setShowCart(!showCart)} className="relative p-3 glass rounded-xl hover:shadow-md transition-all">
              <FiShoppingCart size={20} className="text-forest-700" />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-terracotta-500 rounded-full text-xs text-white flex items-center justify-center font-bold">{cart.length}</span>}
            </button>
          </div>

          {/* Search & Filters */}
          <div className="glass rounded-2xl p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={16} />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm"
                    placeholder="Search crops, farmers, locations..." />
                </div>
              </div>
              <input type="text" placeholder="State" value={filters.state} onChange={e => setFilters({...filters, state: e.target.value})}
                className="px-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm w-32" />
              <input type="text" placeholder="District" value={filters.district} onChange={e => setFilters({...filters, district: e.target.value})}
                className="px-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm w-32" />
              <input type="number" placeholder="Min ₹" value={filters.minPrice} onChange={e => setFilters({...filters, minPrice: e.target.value})}
                className="px-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm w-24" />
              <input type="number" placeholder="Max ₹" value={filters.maxPrice} onChange={e => setFilters({...filters, maxPrice: e.target.value})}
                className="px-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm w-24" />
              <label className="flex items-center space-x-2 text-sm text-forest-600">
                <input type="checkbox" checked={filters.organicCertified} onChange={e => setFilters({...filters, organicCertified: e.target.checked})}
                  className="rounded border-forest-300 text-forest-700" />
                <span>Organic</span>
              </label>
            </div>
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map((listing, i) => (
                <motion.div key={listing.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                  className="glass rounded-2xl overflow-hidden group hover:shadow-xl transition-all">
                  <div className="relative h-40 bg-gradient-to-br from-forest-100 to-amber-50 flex items-center justify-center">
                    <span className="text-5xl">{listing.organicCertified ? '🌱' : '🌾'}</span>
                    <div className="absolute inset-0 bg-gradient-to-t from-forest-900/40 to-transparent" />
                    <div className="absolute top-3 right-3 flex space-x-2">
                      {listing.organicCertified && <span className="px-2 py-0.5 bg-amber-500/90 text-white text-xs rounded-full">Organic</span>}
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <span className="flex items-center text-white text-xs"><FiMapPin className="mr-1" size={12} />{listing.district}, {listing.state}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-heading font-bold text-forest-700">{listing.cropName}</h3>
                        {listing.variety && <p className="text-xs text-forest-400">{listing.variety}</p>}
                      </div>
                      <button onClick={() => toggleWishlist(listing.id)} className="p-1.5 rounded-lg hover:bg-forest-100 text-forest-400 hover:text-red-400 transition-all">
                        <FiHeart size={16} />
                      </button>
                    </div>
                    <div className="flex items-center space-x-3 text-sm mb-3">
                      <span className="font-bold text-amber-600">{formatPrice(listing.price)}/{listing.unit}</span>
                      <span className="text-forest-400">{listing.quantity} {listing.unit}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Link to={`/profile/${listing.farmer.id}`} className="flex items-center space-x-2 text-xs text-forest-500 hover:text-forest-700">
                        <div className="w-6 h-6 rounded-full bg-forest-200 flex items-center justify-center text-[10px] font-bold text-forest-700">
                          {listing.farmer.name.charAt(0)}
                        </div>
                        <span>{listing.farmer.name.split(' ')[0]}</span>
                        {listing.farmer.isVerified && <FiStar size={10} className="text-amber-500" />}
                      </Link>
                      <button onClick={() => addToCart(listing.id)}
                        className="px-3 py-1.5 bg-forest-700 hover:bg-forest-800 text-cream text-xs font-medium rounded-lg transition-all">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {filteredListings.length === 0 && !loading && (
            <div className="glass rounded-2xl p-12 text-center">
              <FiSearch className="w-12 h-12 text-forest-300 mx-auto mb-4" />
              <p className="text-forest-500">No listings found matching your criteria</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            className="relative w-full max-w-md bg-cream h-full shadow-2xl overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-heading font-bold text-forest-700">Cart ({cart.length})</h2>
                <button onClick={() => setShowCart(false)} className="text-forest-400 hover:text-forest-600">✕</button>
              </div>
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <FiShoppingCart className="w-12 h-12 text-forest-300 mx-auto mb-4" />
                  <p className="text-forest-500">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, i) => (
                    <div key={item.id} className="glass rounded-xl p-4 flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-forest-100 flex items-center justify-center text-lg flex-shrink-0">🌾</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-forest-700">{item.listing.cropName}</p>
                        <p className="text-xs text-forest-400">{item.quantity} × {formatPrice(item.listing.price)}</p>
                      </div>
                      <p className="font-semibold text-amber-600 text-sm">{formatPrice(item.listing.price * item.quantity)}</p>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-forest-200/30">
                    <div className="flex justify-between mb-4">
                      <span className="font-medium text-forest-700">Total</span>
                      <span className="font-bold text-amber-600 text-lg">{formatPrice(cartTotal)}</span>
                    </div>
                    <button className="w-full py-3 bg-forest-700 hover:bg-forest-800 text-cream font-semibold rounded-xl transition-all">
                      Proceed to Inquiry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
