import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMapPin, FiStar, FiShield, FiHeart, FiShoppingCart, FiMessageCircle, FiCalendar, FiCheck } from 'react-icons/fi';
import { formatPrice, formatDate } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

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
  harvestDate?: string;
  description?: string;
  organicCertified: boolean;
  status: string;
  farmer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    state: string;
    district: string;
    trustScore: number;
    isVerified: boolean;
    isOrganic: boolean;
    avatar?: string;
    createdAt: string;
  };
  createdAt: string;
}

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [inquiryQty, setInquiryQty] = useState(100);

  useEffect(() => {
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    try {
      const { data } = await api.get(`/listings/${id}`);
      setListing(data.listing);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const sendInquiry = async () => {
    if (!user) return navigate('/login');
    try {
      await api.post('/inquiries', {
        listingId: id,
        message: inquiryMsg || `Interested in your ${listing?.cropName}`,
        quantity: inquiryQty,
      });
      toast.success('Inquiry sent! The farmer will contact you.');
      setInquiryMsg('');
    } catch (err) { toast.error('Failed to send inquiry'); }
  };

  const startChat = () => {
    if (!user) return navigate('/login');
    navigate('/chat');
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="skeleton h-64 rounded-2xl mb-4" />
          <div className="skeleton h-8 w-64 mb-2" />
          <div className="skeleton h-4 w-96" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-forest-500">Listing not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid md:grid-cols-5 gap-8">
            {/* Image */}
            <div className="md:col-span-3">
              <div className="h-80 rounded-2xl bg-gradient-to-br from-forest-100 to-amber-50 flex items-center justify-center relative overflow-hidden">
                <span className="text-8xl opacity-30">🌾</span>
                <div className="absolute inset-0 bg-gradient-to-t from-forest-900/30 to-transparent" />
                <div className="absolute top-4 left-4 flex space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${listing.status === 'ACTIVE' ? 'bg-green-500/90 text-white' : 'bg-forest-500/90 text-white'}`}>
                    {listing.status}
                  </span>
                  {listing.organicCertified && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/90 text-white">🌱 Organic</span>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h1 className="text-3xl font-heading font-bold text-forest-700">{listing.cropName}</h1>
                {listing.variety && <p className="text-forest-400 text-lg">{listing.variety}</p>}
                {listing.description && <p className="text-forest-600 mt-4 leading-relaxed">{listing.description}</p>}
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="glass rounded-xl p-4">
                    <p className="text-xs text-forest-400">Price</p>
                    <p className="text-2xl font-heading font-bold text-amber-600">{formatPrice(listing.price)}</p>
                    <p className="text-xs text-forest-400">per {listing.unit}</p>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <p className="text-xs text-forest-400">Available</p>
                    <p className="text-2xl font-heading font-bold text-forest-700">{listing.quantity}</p>
                    <p className="text-xs text-forest-400">{listing.unit}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center text-sm text-forest-500">
                    <FiMapPin className="mr-1.5" />{listing.district}, {listing.state}
                  </div>
                  {listing.harvestDate && (
                    <div className="flex items-center text-sm text-forest-500">
                      <FiCalendar className="mr-1.5" />Harvest: {formatDate(listing.harvestDate)}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-forest-500">
                    <FiCheck className="mr-1.5" />Listed {formatDate(listing.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="md:col-span-2">
              {/* Farmer Card */}
              <div className="glass rounded-2xl p-6 mb-4">
                <h3 className="font-heading font-bold text-forest-700 mb-4">Farmer</h3>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-forest-500 to-amber-500 flex items-center justify-center text-white font-bold text-lg">
                    {listing.farmer.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-forest-700">{listing.farmer.name}</p>
                    <div className="flex items-center space-x-2 text-xs text-forest-400">
                      <FiMapPin size={11} /><span>{listing.farmer.district}, {listing.farmer.state}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-forest-500">Trust Score</span>
                    <span className="flex items-center font-medium text-forest-700">
                      <FiShield className="mr-1 text-amber-500" size={14} />
                      {listing.farmer.trustScore}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-forest-500">Verified</span>
                    {listing.farmer.isVerified
                      ? <span className="flex items-center text-green-600"><FiCheck className="mr-1" size={14} />Verified</span>
                      : <span className="text-forest-400">Pending</span>
                    }
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-forest-500">Member Since</span>
                    <span className="text-forest-600">{formatDate(listing.farmer.createdAt)}</span>
                  </div>
                </div>
                <button onClick={startChat}
                  className="w-full mt-4 py-2.5 flex items-center justify-center space-x-2 bg-forest-700 hover:bg-forest-800 text-cream font-medium rounded-xl transition-all">
                  <FiMessageCircle size={16} /><span>Chat with Farmer</span>
                </button>
              </div>

              {/* Inquiry Form */}
              <div className="glass rounded-2xl p-6">
                <h3 className="font-heading font-bold text-forest-700 mb-4">Send Inquiry</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-forest-500 mb-1">Quantity needed ({listing.unit})</label>
                    <input type="number" value={inquiryQty} onChange={e => setInquiryQty(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-forest-500 mb-1">Message (optional)</label>
                    <textarea value={inquiryMsg} onChange={e => setInquiryMsg(e.target.value)} rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm resize-none"
                      placeholder={`Hi, I'm interested in your ${listing.cropName}...`} />
                  </div>
                  <button onClick={sendInquiry}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-forest-900 font-semibold rounded-xl transition-all">
                    Send Inquiry
                  </button>
                  <div className="flex space-x-2">
                    <button className="flex-1 py-2 flex items-center justify-center space-x-1 border border-forest-200 rounded-xl text-sm text-forest-600 hover:bg-forest-50 transition-all">
                      <FiHeart size={14} /><span>Wishlist</span>
                    </button>
                    <button className="flex-1 py-2 flex items-center justify-center space-x-1 border border-forest-200 rounded-xl text-sm text-forest-600 hover:bg-forest-50 transition-all">
                      <FiShoppingCart size={14} /><span>Cart</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
