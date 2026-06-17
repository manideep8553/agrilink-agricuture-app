import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiPackage, FiDollarSign, FiTrendingUp, FiStar, FiEdit2, FiTrash2, FiMapPin, FiMessageCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { formatPrice, formatDate } from '../utils/helpers';
import api from '../utils/api';
import WeatherWidget from '../components/WeatherWidget';
import MarketTicker from '../components/MarketTicker';
import SeasonalCalendar from '../components/SeasonalCalendar';

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
  status: string;
  organicCertified: boolean;
  createdAt: string;
}

export default function FarmerDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ cropName: '', variety: '', quantity: '', unit: 'kg', price: '', state: user?.state || '', district: user?.district || '', description: '', organicCertified: false });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [listingsRes, inquiriesRes] = await Promise.all([
        api.get('/listings/mine'),
        api.get('/inquiries/received'),
      ]);
      setListings(listingsRes.data.listings);
      setInquiries(inquiriesRes.data.inquiries);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddListing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/listings', {
        ...form,
        quantity: parseFloat(form.quantity),
        price: parseFloat(form.price),
      });
      setShowAddModal(false);
      setForm({ cropName: '', variety: '', quantity: '', unit: 'kg', price: '', state: user?.state || '', district: user?.district || '', description: '', organicCertified: false });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing?')) return;
    try {
      await api.delete(`/listings/${id}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="skeleton h-8 w-64 mb-8" />
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const totalListings = listings.length;
  const activeListings = listings.filter(l => l.status === 'ACTIVE').length;
  const totalValue = listings.reduce((s, l) => s + l.price * l.quantity, 0);

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-heading text-forest-700">My Farm Dashboard</h1>
              <p className="text-forest-500 text-sm mt-1">Welcome back, {user?.name}</p>
            </div>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center px-5 py-3 bg-amber-500 hover:bg-amber-400 text-forest-900 font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/20">
              <FiPlus className="mr-2" /> Add Crop
            </button>
          </div>

          {/* Market Ticker + Weather */}
          <div className="grid md:grid-cols-5 gap-4 mb-6">
            <div className="md:col-span-3"><MarketTicker /></div>
            <div className="md:col-span-2"><WeatherWidget /></div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: FiPackage, label: 'Total Listings', value: totalListings, color: 'text-forest-600 bg-forest-100' },
              { icon: FiTrendingUp, label: 'Active', value: activeListings, color: 'text-green-600 bg-green-100' },
              { icon: FiDollarSign, label: 'Total Value', value: formatPrice(totalValue), color: 'text-amber-600 bg-amber-100' },
              { icon: FiStar, label: 'Trust Score', value: `${user?.trustScore || 0}`, color: 'text-terracotta-600 bg-terracotta-100' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
                className="glass rounded-2xl p-5">
                <div className={`inline-flex p-2.5 rounded-xl ${stat.color} mb-3`}>
                  <stat.icon size={18} />
                </div>
                <p className="text-2xl font-heading font-bold text-forest-700">{stat.value}</p>
                <p className="text-xs text-forest-500 mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Listings */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-heading font-bold text-forest-700 mb-4">My Listings</h2>
              {listings.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <FiPackage className="w-12 h-12 text-forest-300 mx-auto mb-4" />
                  <p className="text-forest-500">No listings yet. Add your first crop!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.map((listing, i) => (
                    <motion.div key={listing.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                      className="glass rounded-2xl p-5 hover:shadow-lg transition-all group">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-forest-100 to-amber-50 flex items-center justify-center text-2xl flex-shrink-0">
                            {listing.organicCertified ? '🌱' : '🌾'}
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-forest-700 text-lg">{listing.cropName}</h3>
                            {listing.variety && <p className="text-xs text-forest-400">{listing.variety}</p>}
                            <div className="flex items-center space-x-4 mt-2 text-sm">
                              <span className="text-forest-600">{listing.quantity} {listing.unit}</span>
                              <span className="font-semibold text-amber-600">{formatPrice(listing.price)}/{listing.unit}</span>
                              <span className="flex items-center text-forest-400"><FiMapPin className="mr-1" size={12} />{listing.district}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${listing.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-forest-100 text-forest-500'}`}>
                                {listing.status}
                              </span>
                              {listing.organicCertified && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Organic</span>}
                              <span className="text-xs text-forest-400">{formatDate(listing.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 rounded-lg hover:bg-forest-100 text-forest-500 hover:text-forest-700 transition-all"><FiEdit2 size={14} /></button>
                          <button onClick={() => handleDelete(listing.id)} className="p-2 rounded-lg hover:bg-red-50 text-forest-500 hover:text-red-500 transition-all"><FiTrash2 size={14} /></button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <SeasonalCalendar />
              <div>
                <h2 className="text-xl font-heading font-bold text-forest-700 mb-4">Inquiries</h2>
              <div className="space-y-3">
                {inquiries.map((inq, i) => (
                  <motion.div key={inq.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                    className="glass rounded-2xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-full bg-forest-100 flex items-center justify-center text-forest-700 font-bold text-sm flex-shrink-0">
                        {inq.buyer.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-forest-700">{inq.buyer.name}</p>
                        <p className="text-xs text-forest-400">{inq.listing.cropName}</p>
                        <p className="text-sm text-forest-600 mt-1 line-clamp-2">{inq.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-forest-400">{inq.quantity} {inq.unit}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${inq.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {inq.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {inquiries.length === 0 && (
                  <div className="glass rounded-2xl p-8 text-center">
                    <FiMessageCircle className="w-8 h-8 text-forest-300 mx-auto mb-2" />
                    <p className="text-sm text-forest-500">No inquiries yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </motion.div>
      </div>

      {/* Add Listing Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-cream rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading font-bold text-forest-700">Add New Crop</h2>
              <button onClick={() => setShowAddModal(false)} className="text-forest-400 hover:text-forest-600">✕</button>
            </div>
            <form onSubmit={handleAddListing} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-forest-600 mb-1">Crop Name *</label>
                  <input type="text" value={form.cropName} onChange={e => setForm({...form, cropName: e.target.value})} required
                    className="w-full px-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm" placeholder="e.g. Wheat" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-forest-600 mb-1">Variety</label>
                  <input type="text" value={form.variety} onChange={e => setForm({...form, variety: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm" placeholder="e.g. Sharbati" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-forest-600 mb-1">Quantity *</label>
                  <input type="number" step="0.1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required
                    className="w-full px-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm" placeholder="1000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-forest-600 mb-1">Unit</label>
                  <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm">
                    <option value="kg">kg</option>
                    <option value="ton">ton</option>
                    <option value="quintal">quintal</option>
                    <option value="bag">bag</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-forest-600 mb-1">Price (₹) *</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required
                    className="w-full px-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm" placeholder="25" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-forest-600 mb-1">State</label>
                  <input type="text" value={form.state} onChange={e => setForm({...form, state: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-forest-600 mb-1">District</label>
                <input type="text" value={form.district} onChange={e => setForm({...form, district: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-forest-600 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm resize-none" />
              </div>
              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={form.organicCertified} onChange={e => setForm({...form, organicCertified: e.target.checked})}
                  className="w-4 h-4 rounded border-forest-300 text-forest-700 focus:ring-forest-500" />
                <span className="text-sm text-forest-600">Organic Certified</span>
              </label>
              <button type="submit"
                className="w-full py-3 bg-forest-700 hover:bg-forest-800 text-cream font-semibold rounded-xl transition-all">
                Add Listing
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
